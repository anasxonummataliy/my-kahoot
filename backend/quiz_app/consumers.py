import json
import time
import asyncio
import random
import uuid
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.db import transaction
from django.db.models import Q, F
from django.utils import timezone
from .models import GameSession, Player, Question, Option, PlayerAnswer, Quiz


def parse_player(p):
    avatar_val = p.get("avatar", "")
    custom_avatar = None
    if isinstance(avatar_val, str) and avatar_val.startswith("{"):
        try:
            custom_avatar = json.loads(avatar_val)
        except Exception:
            pass
    p["customAvatar"] = custom_avatar
    return p


# Global connection tracker: (pin, player_id) -> set of active channel_names
ACTIVE_CONNECTIONS = {}

HOST_ACTIONS = {
    "start_question",
    "end_question",
    "show_leaderboard",
    "next_question",
    "restart_quiz",
    "reset_game",
    "finish_game",
    "end_game",
    "stop_game",
    "cancel_game",
    "add_bot_players",
    "add_bots",
    "toggle_team_mode",
    "kick_player",
}


class QuizConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.pin = self.scope["url_route"]["kwargs"]["pin"]
        self.room_group_name = f"quiz_{self.pin}"
        self.player_id = None  # Track which player this socket belongs to
        self.is_host = False

        # Extract host_token from query param if available
        query_string = self.scope.get("query_string", b"").decode("utf-8")
        from urllib.parse import parse_qs
        qs = parse_qs(query_string)
        token_from_qs = qs.get("host_token", [None])[0]
        user = self.scope.get("user")
        if token_from_qs or (user and user.is_authenticated):
            self.is_host = await self.verify_host_permission(token_from_qs, user)

        # Join room group
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        # Send initial state to the connecting client
        state = await self.get_game_state()
        if state:
            await self.send_json({"type": "init_state", "data": state})
        else:
            await self.send_json({"type": "error", "message": "Session not found"})

    async def disconnect(self, close_code):
        # Untrack this channel
        if self.player_id:
            key = (self.pin, self.player_id)
            if key in ACTIVE_CONNECTIONS:
                ACTIVE_CONNECTIONS[key].discard(self.channel_name)
                # If no connections remain for this player, wait 60 seconds before removing (to allow reload or lock screen)
                if not ACTIVE_CONNECTIONS[key]:
                    asyncio.create_task(self.delayed_disconnect_check(self.pin, self.player_id))

        # Leave room group
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def delayed_disconnect_check(self, pin, player_id):
        """Wait 60 seconds before removing disconnected player from lobby, to allow page reloads or brief mobile screen locks."""
        await asyncio.sleep(60)
        key = (pin, player_id)
        # If player did not reconnect within 60 seconds, remove them ONLY if still in lobby
        if key in ACTIVE_CONNECTIONS and len(ACTIVE_CONNECTIONS[key]) == 0:
            ACTIVE_CONNECTIONS.pop(key, None)
            removed = await self.remove_player_if_lobby(player_id)
            if removed:
                all_players = await self.get_players_list()
                await self.channel_layer.group_send(
                    f"quiz_{pin}",
                    {
                        "type": "broadcast_event",
                        "event": "player_left",
                        "data": {
                            "player_id": player_id,
                            "all_players": all_players,
                            "players_count": len(all_players),
                        },
                    },
                )

    async def receive_json(self, content):
        action = content.get("action")
        payload = content.get("payload", {})

        # Host Authorization Check
        if action in HOST_ACTIONS:
            token = payload.get("host_token")
            user = self.scope.get("user")
            if not self.is_host:
                self.is_host = await self.verify_host_permission(token, user)
            if not self.is_host:
                await self.send_json({
                    "type": "error",
                    "message": "Host huquqi talab qilinadi (Avtorizatsiyadan o'tilmagan).",
                })
                return

        if action == "join_game":
            await self.handle_join_game(payload)
        elif action == "reconnect_player":
            await self.handle_reconnect_player(payload)
        elif action in ("leave_game", "kick_player"):
            await self.handle_leave_game(payload)
        elif action == "update_avatar":
            await self.handle_update_avatar(payload)
        elif action == "start_question":
            await self.handle_start_question(payload)
        elif action == "submit_answer":
            await self.handle_submit_answer(payload)
        elif action == "end_question":
            await self.handle_end_question(payload)
        elif action == "show_leaderboard":
            await self.handle_show_leaderboard(payload)
        elif action == "next_question":
            await self.handle_next_question(payload)
        elif action in ("restart_quiz", "reset_game"):
            await self.handle_restart_quiz(payload)
        elif action in ("finish_game", "end_game"):
            await self.handle_finish_game(payload)
        elif action in ("stop_game", "cancel_game"):
            await self.handle_stop_game(payload)
        elif action in ("add_bot_players", "add_bots"):
            await self.handle_add_bot_players(payload)
        elif action == "toggle_team_mode":
            await self.handle_toggle_team_mode(payload)

    # Handlers
    async def handle_reconnect_player(self, payload):
        """Re-associate socket with player after page reload."""
        player_id = payload.get("player_id")
        if not player_id:
            return
        exists = await self.verify_player_in_session(player_id)
        if exists:
            self.player_id = player_id
            key = (self.pin, self.player_id)
            if key not in ACTIVE_CONNECTIONS:
                ACTIVE_CONNECTIONS[key] = set()
            ACTIVE_CONNECTIONS[key].add(self.channel_name)

    async def handle_join_game(self, payload):
        nickname = payload.get("nickname", "Player").strip() or "Player"
        custom_avatar = payload.get("customAvatar")
        if custom_avatar and isinstance(custom_avatar, dict):
            avatar = json.dumps(custom_avatar)
        else:
            avatar = str(payload.get("avatar", "🚀"))
        team_name = payload.get("team_name", "").strip()
        team_color = payload.get("team_color", "#ff6b00")
        is_host = payload.get("is_host", False)
        player_token = payload.get("player_token")

        player_data = await self.create_or_get_player(nickname, avatar, team_name, team_color, is_host, player_token)
        if "error" in player_data:
            await self.send_json({
                "type": "error",
                "message": player_data["error"],
            })
            return

        # Track which player this WebSocket connection belongs to
        self.player_id = player_data.get("id")
        key = (self.pin, self.player_id)
        if key not in ACTIVE_CONNECTIONS:
            ACTIVE_CONNECTIONS[key] = set()
        ACTIVE_CONNECTIONS[key].add(self.channel_name)

        # Broadcast player joined to everyone in the room
        all_players = await self.get_players_list()
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "broadcast_event",
                "event": "player_joined",
                "data": {
                    "player": player_data,
                    "all_players": all_players,
                    "players_count": len(all_players),
                },
            },
        )

        # Send confirmation to the joining client
        await self.send_json({
            "type": "join_success",
            "player": player_data,
        })

    async def handle_leave_game(self, payload):
        """Player explicitly leaves or host kicks a player. Remove immediately and broadcast."""
        player_id = payload.get("player_id") or self.player_id
        if not player_id:
            return

        key = (self.pin, player_id)
        ACTIVE_CONNECTIONS.pop(key, None)

        removed = await self.remove_player(player_id)
        if removed:
            if self.player_id == player_id:
                self.player_id = None
            all_players = await self.get_players_list()
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "broadcast_event",
                    "event": "player_left",
                    "data": {
                        "player_id": player_id,
                        "all_players": all_players,
                        "players_count": len(all_players),
                    },
                },
            )

    async def handle_update_avatar(self, payload):
        """Player updates their avatar while in lobby."""
        player_id = payload.get("player_id") or self.player_id
        custom_avatar = payload.get("customAvatar")
        if not player_id or not custom_avatar:
            return

        updated_player = await self.update_player_avatar(player_id, custom_avatar)
        if updated_player:
            all_players = await self.get_players_list()
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "broadcast_event",
                    "event": "player_updated",
                    "data": {
                        "player": updated_player,
                        "all_players": all_players,
                        "players_count": len(all_players),
                    },
                },
            )

    async def handle_toggle_team_mode(self, payload):
        is_team_mode = bool(payload.get("is_team_mode", True))
        updated_mode = await self.set_team_mode(is_team_mode)
        all_players = await self.get_players_list()
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "broadcast_event",
                "event": "team_mode_toggled",
                "data": {
                    "is_team_mode": updated_mode,
                    "all_players": all_players,
                },
            },
        )

    async def handle_start_question(self, payload):
        question_data = await self.start_current_question()
        if not question_data:
            await self.send_json({
                "type": "error",
                "message": "Savol topilmadi yoki bu testda savollar mavjud emas.",
            })
            return

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "broadcast_event",
                "event": "question_started",
                "data": question_data,
            },
        )
        # Auto-simulate bot answers in background if any bots exist
        asyncio.create_task(self.simulate_bot_answers(question_data["id"]))

    async def handle_submit_answer(self, payload):
        player_id = payload.get("player_id")
        question_id = payload.get("question_id")
        option_id = payload.get("option_id")

        result = await self.record_answer(player_id, question_id, option_id)
        if result:
            # Send private result back to answering player
            await self.send_json({
                "type": "answer_result",
                "data": result,
            })

            # Broadcast updated answer count and live stats to room (for host)
            stats = await self.get_answer_counts(question_id)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "broadcast_event",
                    "event": "answer_count_updated",
                    "data": stats,
                },
            )

            # Check if ALL players have answered - if so, immediately end question without waiting for timer!
            if stats["total_players"] > 0 and stats["answered_count"] >= stats["total_players"]:
                review_data = await self.end_question_and_get_review(force=True)
                if review_data:
                    await self.broadcast_question_ended_and_schedule_leaderboard(review_data)

    async def handle_end_question(self, payload):
        review_data = await self.end_question_and_get_review(force=True)
        if review_data:
            await self.broadcast_question_ended_and_schedule_leaderboard(review_data)

    async def broadcast_question_ended_and_schedule_leaderboard(self, review_data):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "broadcast_event",
                "event": "question_ended",
                "data": review_data,
            },
        )
        # Automatically advance to leaderboard after 2.2 seconds of review
        asyncio.create_task(self.auto_advance_to_leaderboard())

    async def auto_advance_to_leaderboard(self):
        await asyncio.sleep(2.2)
        status = await self.get_session_status()
        if status == "review":
            leaderboard_data = await self.set_leaderboard_and_get_data()
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "broadcast_event",
                    "event": "leaderboard_view",
                    "data": leaderboard_data,
                },
            )

    @database_sync_to_async
    def get_session_status(self):
        try:
            return GameSession.objects.filter(pin=self.pin).values_list("status", flat=True).first()
        except Exception:
            return None

    async def handle_show_leaderboard(self, payload):
        leaderboard_data = await self.set_leaderboard_and_get_data()
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "broadcast_event",
                "event": "leaderboard_view",
                "data": leaderboard_data,
            },
        )

    async def handle_next_question(self, payload):
        next_data = await self.advance_next_question()
        if next_data["is_finished"]:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "broadcast_event",
                    "event": "game_finished",
                    "data": next_data,
                },
            )
        else:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "broadcast_event",
                    "event": "question_started",
                    "data": next_data["question_data"],
                },
            )
            # Auto-simulate bot answers for next question
            asyncio.create_task(self.simulate_bot_answers(next_data["question_data"]["id"]))

    async def handle_restart_quiz(self, payload):
        reset_data = await self.reset_game_session()
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "broadcast_event",
                "event": "game_reset",
                "data": reset_data,
            },
        )

    async def handle_finish_game(self, payload):
        """Host explicitly finishes game and opens podium / final leaderboard."""
        finish_data = await self.finish_game_session()
        if finish_data:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "broadcast_event",
                    "event": "game_finished",
                    "data": finish_data,
                },
            )

    async def handle_stop_game(self, payload):
        """Host stops competition: either reset everyone to lobby or cancel completely."""
        mode = payload.get("mode", "lobby")
        if mode == "cancel":
            await self.cancel_game_session()
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "broadcast_event",
                    "event": "game_stopped",
                    "data": {
                        "message": "Boshlovchi musobaqani to'xtatdi.",
                        "mode": "cancel",
                    },
                },
            )
        else:
            reset_data = await self.reset_game_session()
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "broadcast_event",
                    "event": "game_stopped",
                    "data": {
                        "message": "Boshlovchi musobaqani to'xtatdi va barchani lobbiga qaytardi.",
                        "mode": "lobby",
                        "session": reset_data,
                    },
                },
            )

    async def handle_add_bot_players(self, payload):
        bots = await self.add_demo_bots()
        all_players = await self.get_players_list()
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "broadcast_event",
                "event": "player_joined",
                "data": {
                    "player": bots[-1] if bots else None,
                    "all_players": all_players,
                    "players_count": len(all_players),
                },
            },
        )

    # Group message handler
    async def broadcast_event(self, event):
        await self.send_json({
            "type": event["event"],
            "data": event["data"],
        })

    # Database helpers (sync_to_async)
    @database_sync_to_async
    def verify_host_permission(self, token=None, user=None):
        try:
            session = GameSession.objects.select_related("quiz", "quiz__creator").get(pin=self.pin)
        except GameSession.DoesNotExist:
            return False

        if token and str(session.host_token) == str(token):
            return True
        if user and user.is_authenticated:
            if user.is_superuser or user.is_staff or (session.quiz.creator and session.quiz.creator == user):
                return True
        return False

    @database_sync_to_async
    def verify_host_token(self, token):
        if not token:
            return False
        return GameSession.objects.filter(pin=self.pin, host_token=token).exists()

    @database_sync_to_async
    def get_game_state(self):
        try:
            session = GameSession.objects.select_related("quiz").get(pin=self.pin)
        except GameSession.DoesNotExist:
            return None

        players = [parse_player(p) for p in session.players.all().values("id", "nickname", "avatar", "team_name", "team_color", "score", "streak")]
        total_questions = session.quiz.questions.count()
        current_q = session.current_question

        q_data = None
        if current_q:
            # Hide is_correct from general game state broadcast!
            options = list(current_q.options.all().values("id", "option_text", "color", "shape", "order"))
            q_data = {
                "id": current_q.id,
                "question_text": current_q.question_text,
                "time_limit": current_q.time_limit,
                "points": current_q.points,
                "order": current_q.order,
                "options": options,
                "index": session.current_question_index + 1,
                "total": total_questions,
                "start_time": session.question_start_time,
            }

        return {
            "pin": session.pin,
            "status": session.status,
            "quiz_title": session.quiz.title,
            "quiz_description": session.quiz.description,
            "is_team_mode": session.is_team_mode,
            "total_questions": total_questions,
            "current_question_index": session.current_question_index,
            "question_start_time": session.question_start_time,
            "current_question": q_data,
            "players": players,
            "players_count": len(players),
        }

    @database_sync_to_async
    def create_or_get_player(self, nickname, avatar, team_name, team_color, is_host, player_token=None):
        session = GameSession.objects.get(pin=self.pin)
        if not session.is_team_mode:
            team_name = ""
            team_color = "#ff6b00"
        elif not team_name:
            team_name = "Red Dragons"
            team_color = "#ef4444"

        existing = session.players.filter(nickname__iexact=nickname).first()

        if existing:
            # Prevent nickname hijacking: only permit if player_token matches!
            if player_token and str(existing.player_token) == str(player_token):
                player = existing
                player.avatar = avatar
                player.team_name = team_name
                player.team_color = team_color
                player.save()
            else:
                return {"error": "Bu ism allaqachon band. Iltimos, boshqa ism tanlang."}
        else:
            if session.status != "lobby":
                return {"error": "O'yin boshlangan. Yangi o'yinchilar faqat kutish zalida (lobby) qo'shilishi mumkin."}

            player = Player.objects.create(
                session=session,
                nickname=nickname,
                avatar=avatar,
                team_name=team_name,
                team_color=team_color,
            )

        p_dict = {
            "id": player.id,
            "player_token": str(player.player_token),
            "nickname": player.nickname,
            "avatar": player.avatar,
            "team_name": player.team_name,
            "team_color": player.team_color,
            "score": player.score,
            "streak": player.streak,
        }
        return parse_player(p_dict)

    @database_sync_to_async
    def remove_player(self, player_id):
        """Remove a player from the session entirely."""
        try:
            player = Player.objects.get(id=player_id, session__pin=self.pin)
            PlayerAnswer.objects.filter(player=player).delete()
            player.delete()
            return True
        except Player.DoesNotExist:
            return False

    @database_sync_to_async
    def remove_player_if_lobby(self, player_id):
        """Remove a player only if the session is still in lobby state."""
        try:
            session = GameSession.objects.get(pin=self.pin)
            if session.status != "lobby":
                return False
            player = Player.objects.get(id=player_id, session=session)
            if str(player.player_token).startswith("bot_"):
                return False
            PlayerAnswer.objects.filter(player=player).delete()
            player.delete()
            return True
        except (GameSession.DoesNotExist, Player.DoesNotExist):
            return False

    @database_sync_to_async
    def verify_player_in_session(self, player_id):
        return Player.objects.filter(id=player_id, session__pin=self.pin).exists()

    @database_sync_to_async
    def update_player_avatar(self, player_id, custom_avatar):
        """Update a player's avatar in the database."""
        try:
            player = Player.objects.get(id=player_id, session__pin=self.pin)
            if isinstance(custom_avatar, dict):
                player.avatar = json.dumps(custom_avatar)
            else:
                player.avatar = str(custom_avatar)
            player.save(update_fields=["avatar"])
            p_dict = {
                "id": player.id,
                "player_token": str(player.player_token),
                "nickname": player.nickname,
                "avatar": player.avatar,
                "team_name": player.team_name,
                "team_color": player.team_color,
                "score": player.score,
                "streak": player.streak,
            }
            return parse_player(p_dict)
        except Player.DoesNotExist:
            return None

    @database_sync_to_async
    def set_team_mode(self, is_team_mode):
        session = GameSession.objects.get(pin=self.pin)
        session.is_team_mode = bool(is_team_mode)
        session.save(update_fields=["is_team_mode"])
        if not session.is_team_mode:
            session.players.all().update(team_name="", team_color="#ff6b00")
        return session.is_team_mode

    @database_sync_to_async
    def get_players_list(self):
        session = GameSession.objects.get(pin=self.pin)
        return [parse_player(p) for p in session.players.all().values("id", "nickname", "avatar", "team_name", "team_color", "score", "streak")]

    @database_sync_to_async
    def start_current_question(self):
        try:
            session = GameSession.objects.select_related("quiz").get(pin=self.pin)
        except GameSession.DoesNotExist:
            return None

        current_q = session.current_question
        if not current_q:
            if session.quiz.questions.exists():
                session.current_question_index = 0
                session.save(update_fields=["current_question_index"])
                current_q = session.current_question
            if not current_q:
                return None

        session.status = "question"
        session.question_start_time = time.time()
        session.save(update_fields=["status", "question_start_time"])

        # Never leak is_correct to players on question start!
        options = list(current_q.options.all().values("id", "option_text", "color", "shape", "order"))
        total = session.quiz.questions.count()

        return {
            "id": current_q.id,
            "question_text": current_q.question_text,
            "time_limit": current_q.time_limit,
            "points": current_q.points,
            "order": current_q.order,
            "options": options,
            "index": session.current_question_index + 1,
            "total": total,
            "start_time": session.question_start_time,
        }

    @database_sync_to_async
    def record_answer(self, player_id, question_id, option_id):
        try:
            session = GameSession.objects.get(pin=self.pin)
            if session.status != "question":
                return None
            question = Question.objects.get(id=question_id)
            option = Option.objects.get(id=option_id, question=question)
        except (GameSession.DoesNotExist, Question.DoesNotExist, Option.DoesNotExist):
            return None

        now = time.time()
        start = session.question_start_time or now
        elapsed = now - start

        # Check if submitted after question timer expired (+1.2s network grace period)
        is_late = elapsed > (float(question.time_limit) + 1.2)
        time_taken = max(0.1, min(float(question.time_limit), elapsed))

        is_correct = option.is_correct and not is_late
        points_awarded = 0

        # Atomic transaction to prevent race conditions and duplicate answers
        with transaction.atomic():
            try:
                player = Player.objects.select_for_update().get(id=player_id, session=session)
            except Player.DoesNotExist:
                return None

            if PlayerAnswer.objects.filter(player=player, question=question).exists():
                return None

            if is_correct:
                ratio = max(0.0, 1.0 - (time_taken / question.time_limit))
                speed_score = int(question.points * (0.5 + 0.5 * ratio))
                streak_bonus = player.streak * 50
                points_awarded = speed_score + streak_bonus

                Player.objects.filter(id=player.id).update(
                    score=F("score") + points_awarded,
                    streak=F("streak") + 1,
                )
            else:
                Player.objects.filter(id=player.id).update(streak=0)

            player.refresh_from_db()

            PlayerAnswer.objects.create(
                session=session,
                player=player,
                question=question,
                selected_option=option,
                is_correct=is_correct,
                points_awarded=points_awarded,
                time_taken=round(time_taken, 2),
            )

        return {
            "player_id": player.id,
            "question_id": question.id,
            "option_id": option.id,
            "is_correct": is_correct,
            "points_awarded": points_awarded,
            "new_score": player.score,
            "streak": player.streak,
            "time_taken": round(time_taken, 2),
            "is_late": is_late,
        }

    @database_sync_to_async
    def get_answer_counts(self, question_id):
        session = GameSession.objects.get(pin=self.pin)
        total_players = session.players.count()
        answers = PlayerAnswer.objects.filter(session=session, question_id=question_id)
        answered_count = answers.count()

        counts_by_color = {"blue": 0, "red": 0, "orange": 0, "green": 0}
        for a in answers.select_related("selected_option"):
            if a.selected_option and a.selected_option.color in counts_by_color:
                counts_by_color[a.selected_option.color] += 1

        return {
            "question_id": question_id,
            "answered_count": answered_count,
            "total_players": total_players,
            "counts_by_color": counts_by_color,
        }

    @database_sync_to_async
    def end_question_and_get_review(self, force=False):
        session = GameSession.objects.select_related("quiz").get(pin=self.pin)
        current_q = session.current_question
        if not current_q:
            return None

        if not force and session.status != "question":
            return None

        session.status = "review"
        session.save(update_fields=["status"])

        options = list(current_q.options.all().values("id", "option_text", "color", "shape", "order", "is_correct"))
        correct_option = next((opt for opt in options if opt["is_correct"]), None)

        answers = PlayerAnswer.objects.filter(session=session, question=current_q)
        total_answers = answers.count()
        total_players = session.players.count()

        color_counts = {"blue": 0, "red": 0, "orange": 0, "green": 0}
        option_counts = {}
        for a in answers.select_related("selected_option"):
            if a.selected_option:
                c = a.selected_option.color
                color_counts[c] = color_counts.get(c, 0) + 1
                opt_id = a.selected_option.id
                option_counts[opt_id] = option_counts.get(opt_id, 0) + 1

        return {
            "question_id": current_q.id,
            "question_text": current_q.question_text,
            "options": options,
            "correct_option_id": correct_option["id"] if correct_option else None,
            "total_answers": total_answers,
            "total_players": total_players,
            "color_counts": color_counts,
            "option_counts": option_counts,
        }

    @database_sync_to_async
    def set_leaderboard_and_get_data(self):
        session = GameSession.objects.get(pin=self.pin)
        session.status = "leaderboard"
        session.save(update_fields=["status"])

        players = list(session.players.all().order_by("-score", "joined_at").values(
            "id", "nickname", "avatar", "team_name", "team_color", "score", "streak"
        ))

        team_map = {}
        for p in players:
            t_name = p["team_name"] or "Independent"
            t_color = p["team_color"] or "#ff6b00"
            if t_name not in team_map:
                team_map[t_name] = {
                    "team_name": t_name,
                    "team_color": t_color,
                    "total_score": 0,
                    "player_count": 0,
                    "players": [],
                }
            team_map[t_name]["total_score"] += p["score"]
            team_map[t_name]["player_count"] += 1
            team_map[t_name]["players"].append(p["nickname"])

        teams = list(team_map.values())
        for t in teams:
            t["avg_score"] = round(t["total_score"] / max(1, t["player_count"]))
        teams.sort(key=lambda x: x["total_score"], reverse=True)

        return {
            "is_team_mode": session.is_team_mode,
            "players": [parse_player(p) for p in players],
            "teams": teams,
            "current_question_index": session.current_question_index + 1,
            "total_questions": session.quiz.questions.count(),
        }

    @database_sync_to_async
    def advance_next_question(self):
        session = GameSession.objects.select_related("quiz").get(pin=self.pin)
        session.current_question_index += 1
        total = session.quiz.questions.count()

        if session.current_question_index >= total:
            session.status = "finished"
            session.save(update_fields=["status", "current_question_index"])

            players = list(session.players.all().order_by("-score").values(
                "id", "nickname", "avatar", "team_name", "team_color", "score", "streak"
            ))
            team_map = {}
            for p in players:
                t_name = p["team_name"] or "Independent"
                t_color = p["team_color"] or "#ff6b00"
                if t_name not in team_map:
                    team_map[t_name] = {"team_name": t_name, "team_color": t_color, "total_score": 0, "player_count": 0}
                team_map[t_name]["total_score"] += p["score"]
                team_map[t_name]["player_count"] += 1
            teams = sorted(list(team_map.values()), key=lambda x: x["total_score"], reverse=True)

            return {
                "is_finished": True,
                "players": [parse_player(p) for p in players],
                "teams": teams,
            }

        session.status = "question"
        session.question_start_time = time.time()
        session.save(update_fields=["status", "current_question_index", "question_start_time"])

        current_q = session.current_question
        # Do not expose is_correct!
        options = list(current_q.options.all().values("id", "option_text", "color", "shape", "order"))

        return {
            "is_finished": False,
            "question_data": {
                "id": current_q.id,
                "question_text": current_q.question_text,
                "time_limit": current_q.time_limit,
                "points": current_q.points,
                "order": current_q.order,
                "options": options,
                "index": session.current_question_index + 1,
                "total": total,
                "start_time": session.question_start_time,
            },
        }

    @database_sync_to_async
    def finish_game_session(self):
        try:
            session = GameSession.objects.select_related("quiz").get(pin=self.pin)
            session.status = "finished"
            session.save(update_fields=["status"])

            players = list(session.players.all().order_by("-score").values(
                "id", "nickname", "avatar", "team_name", "team_color", "score", "streak"
            ))
            team_map = {}
            for p in players:
                t_name = p["team_name"] or "Independent"
                t_color = p["team_color"] or "#ff6b00"
                if t_name not in team_map:
                    team_map[t_name] = {"team_name": t_name, "team_color": t_color, "total_score": 0, "player_count": 0}
                team_map[t_name]["total_score"] += p["score"]
                team_map[t_name]["player_count"] += 1
            teams = sorted(list(team_map.values()), key=lambda x: x["total_score"], reverse=True)

            return {
                "is_finished": True,
                "players": [parse_player(p) for p in players],
                "teams": teams,
            }
        except GameSession.DoesNotExist:
            return None

    @database_sync_to_async
    def reset_game_session(self):
        session = GameSession.objects.get(pin=self.pin)
        session.status = "lobby"
        session.current_question_index = 0
        session.question_start_time = None
        session.save()

        # Reset player scores
        session.players.update(score=0, streak=0)
        session.answers.all().delete()

        players = list(session.players.all().values("id", "nickname", "avatar", "team_name", "team_color", "score", "streak"))
        return {
            "pin": session.pin,
            "status": "lobby",
            "players": [parse_player(p) for p in players],
            "total_questions": session.quiz.questions.count(),
        }

    @database_sync_to_async
    def cancel_game_session(self):
        try:
            session = GameSession.objects.get(pin=self.pin)
            session.status = "finished"
            session.save(update_fields=["status"])
        except GameSession.DoesNotExist:
            pass

    @database_sync_to_async
    def add_demo_bots(self):
        session = GameSession.objects.get(pin=self.pin)
        bot_configs = [
            ("Alex (Eagle)", json.dumps({"bodyType": "bear", "color": "amber", "eyes": "shades", "mouth": "smile", "accessory": "crown"}), "Golden Eagles", "#f59e0b"),
            ("Sarah (Titans)", json.dumps({"bodyType": "cat", "color": "cyan", "eyes": "happy", "mouth": "laugh", "accessory": "headphones"}), "Blue Titans", "#3b82f6"),
            ("Temur (Dragons)", json.dumps({"bodyType": "alien", "color": "red", "eyes": "laser", "mouth": "teeth", "accessory": "horns"}), "Red Dragons", "#ef4444"),
            ("Malika (Cyber)", json.dumps({"bodyType": "robot", "color": "emerald", "eyes": "goggles", "mouth": "tongue", "accessory": "cap"}), "Cyber Wolves", "#10b981"),
            ("Jasur (Titans)", json.dumps({"bodyType": "star", "color": "indigo", "eyes": "wink", "mouth": "mustache", "accessory": "halo"}), "Blue Titans", "#3b82f6"),
            ("Madina (Dragons)", json.dumps({"bodyType": "blob", "color": "rose", "eyes": "anime", "mouth": "smile", "accessory": "flower"}), "Red Dragons", "#ef4444"),
        ]
        created = []
        for name, av_json, team, color in bot_configs:
            if not session.players.filter(nickname=name).exists():
                p = Player.objects.create(
                    session=session,
                    nickname=name,
                    player_token=f"bot_{uuid.uuid4()}",
                    avatar=av_json,
                    team_name=team,
                    team_color=color,
                    score=0,
                    streak=0,
                )
                bot_data = {
                    "id": p.id,
                    "nickname": p.nickname,
                    "avatar": p.avatar,
                    "team_name": p.team_name,
                    "team_color": p.team_color,
                    "score": p.score,
                    "streak": p.streak,
                }
                created.append(parse_player(bot_data))
        return created

    async def simulate_bot_answers(self, question_id):
        # Initial slight pause so human players have time to see question
        await asyncio.sleep(1.0)
        unanswered_bots = await self.get_unanswered_bots(question_id)
        if not unanswered_bots:
            return

        options = await self.get_question_options(question_id)
        if not options:
            return

        for bot in unanswered_bots:
            if not await self.is_session_question_active(question_id):
                break

            await asyncio.sleep(random.uniform(1.0, 2.6))

            if not await self.is_session_question_active(question_id):
                break

            correct_opts = [o for o in options if o["is_correct"]]
            if correct_opts and random.random() < 0.75:
                chosen = random.choice(correct_opts)
            else:
                chosen = random.choice(options)

            res = await self.record_answer(bot["id"], question_id, chosen["id"])
            if res:
                stats = await self.get_answer_counts(question_id)
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "broadcast_event",
                        "event": "answer_count_updated",
                        "data": stats,
                    },
                )
                if stats["total_players"] > 0 and stats["answered_count"] >= stats["total_players"]:
                    review_data = await self.end_question_and_get_review(force=True)
                    if review_data:
                        await self.broadcast_question_ended_and_schedule_leaderboard(review_data)
                    break

    @database_sync_to_async
    def get_unanswered_bots(self, question_id):
        session = GameSession.objects.get(pin=self.pin)
        # CRITICAL FIX: Only treat players with bot_ token as bots! Real users with nicknames like "Ali (7-A)" will NOT be treated as bots!
        bots = session.players.filter(player_token__startswith="bot_")
        answered_ids = PlayerAnswer.objects.filter(
            session=session, question_id=question_id
        ).values_list("player_id", flat=True)
        unanswered = bots.exclude(id__in=answered_ids)
        return list(unanswered.values("id", "nickname"))

    @database_sync_to_async
    def get_question_options(self, question_id):
        try:
            q = Question.objects.get(id=question_id)
            return list(q.options.all().values("id", "is_correct"))
        except Question.DoesNotExist:
            return []

    @database_sync_to_async
    def is_session_question_active(self, question_id):
        try:
            session = GameSession.objects.get(pin=self.pin)
            return (
                session.status == "question"
                and session.current_question is not None
                and session.current_question.id == question_id
            )
        except GameSession.DoesNotExist:
            return False
