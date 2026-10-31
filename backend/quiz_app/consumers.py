import json
import time
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
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


class QuizConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.pin = self.scope["url_route"]["kwargs"]["pin"]
        self.room_group_name = f"quiz_{self.pin}"

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
        # Leave room group
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive_json(self, content):
        action = content.get("action")
        payload = content.get("payload", {})

        if action == "join_game":
            await self.handle_join_game(payload)
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
        elif action == "restart_quiz":
            await self.handle_restart_quiz(payload)
        elif action == "add_bot_players":
            await self.handle_add_bot_players(payload)
        elif action == "toggle_team_mode":
            await self.handle_toggle_team_mode(payload)

    # Handlers
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

        player_data = await self.create_or_get_player(nickname, avatar, team_name, team_color, is_host)
        
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

    async def handle_toggle_team_mode(self, payload):
        is_team_mode = payload.get("is_team_mode", True)
        updated_mode = await self.set_team_mode(is_team_mode)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "broadcast_event",
                "event": "team_mode_toggled",
                "data": {"is_team_mode": updated_mode},
            },
        )

    async def handle_start_question(self, payload):
        question_data = await self.start_current_question()
        if not question_data:
            return

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "broadcast_event",
                "event": "question_started",
                "data": question_data,
            },
        )

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

    async def handle_end_question(self, payload):
        review_data = await self.end_question_and_get_review()
        if review_data:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "broadcast_event",
                    "event": "question_ended",
                    "data": review_data,
                },
            )

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
    def create_or_get_player(self, nickname, avatar, team_name, team_color, is_host):
        session = GameSession.objects.get(pin=self.pin)
        # Check if nickname already exists in session
        existing = session.players.filter(nickname__iexact=nickname).first()
        if existing:
            player = existing
            player.avatar = avatar
            if team_name:
                player.team_name = team_name
                player.team_color = team_color
            player.save()
        else:
            player = Player.objects.create(
                session=session,
                nickname=nickname,
                avatar=avatar,
                team_name=team_name,
                team_color=team_color,
            )
        p_dict = {
            "id": player.id,
            "player_token": player.player_token,
            "nickname": player.nickname,
            "avatar": player.avatar,
            "team_name": player.team_name,
            "team_color": player.team_color,
            "score": player.score,
            "streak": player.streak,
        }
        return parse_player(p_dict)

    @database_sync_to_async
    def set_team_mode(self, is_team_mode):
        session = GameSession.objects.get(pin=self.pin)
        session.is_team_mode = is_team_mode
        session.save(update_fields=["is_team_mode"])
        return session.is_team_mode

    @database_sync_to_async
    def get_players_list(self):
        session = GameSession.objects.get(pin=self.pin)
        return [parse_player(p) for p in session.players.all().values("id", "nickname", "avatar", "team_name", "team_color", "score", "streak")]

    @database_sync_to_async
    def start_current_question(self):
        session = GameSession.objects.select_related("quiz").get(pin=self.pin)
        current_q = session.current_question
        if not current_q:
            return None

        session.status = "question"
        session.question_start_time = time.time()
        session.save(update_fields=["status", "question_start_time"])

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
            player = Player.objects.get(id=player_id, session__pin=self.pin)
            question = Question.objects.get(id=question_id)
            option = Option.objects.get(id=option_id, question=question)
            session = player.session
        except (Player.DoesNotExist, Question.DoesNotExist, Option.DoesNotExist):
            return None

        # Check if already answered
        existing = PlayerAnswer.objects.filter(player=player, question=question).first()
        if existing:
            return None

        # Calculate time taken
        now = time.time()
        start = session.question_start_time or now
        time_taken = max(0.1, min(float(question.time_limit), now - start))

        is_correct = option.is_correct
        points_awarded = 0
        if is_correct:
            # Score formula: based on quickness (Kahoot style: up to 1000 pts) + streak bonus
            ratio = max(0.0, 1.0 - (time_taken / question.time_limit))
            speed_score = int(question.points * (0.5 + 0.5 * ratio))
            streak_bonus = player.streak * 50
            points_awarded = speed_score + streak_bonus
            player.score += points_awarded
            player.streak += 1
        else:
            player.streak = 0

        player.save(update_fields=["score", "streak"])

        answer = PlayerAnswer.objects.create(
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
    def end_question_and_get_review(self):
        session = GameSession.objects.select_related("quiz").get(pin=self.pin)
        current_q = session.current_question
        if not current_q:
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

        # Individual standings
        players = list(session.players.all().order_by("-score", "joined_at").values(
            "id", "nickname", "avatar", "team_name", "team_color", "score", "streak"
        ))

        # Team standings
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
            "players": players,
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
            
            # Prepare podium
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
                "players": players,
                "teams": teams,
            }

        session.status = "question"
        session.question_start_time = time.time()
        session.save(update_fields=["status", "current_question_index", "question_start_time"])

        current_q = session.current_question
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
            "players": players,
        }

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
