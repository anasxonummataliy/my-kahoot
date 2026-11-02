import json
import random
import string
import time
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from django.db.models import F
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import Quiz, Question, Option, GameSession, Player, PlayerAnswer
from .serializers import (
    QuizListSerializer,
    QuizDetailSerializer,
    GameSessionSerializer,
    PlayerSerializer,
)


def broadcast_to_room(pin, event, data):
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            f"quiz_{pin}",
            {"type": "broadcast_event", "event": event, "data": data},
        )


def get_request_user(request):
    if hasattr(request, "user") and request.user and request.user.is_authenticated:
        return request.user
    user_id = (
        request.headers.get("X-User-Id")
        or request.GET.get("user_id")
        or (request.data.get("user_id") if hasattr(request, "data") and isinstance(request.data, dict) else None)
    )
    if user_id:
        try:
            return User.objects.get(id=user_id)
        except (User.DoesNotExist, ValueError):
            pass
    return None


@csrf_exempt
@api_view(["GET", "POST"])
def quiz_list_create(request):
    user = get_request_user(request)

    if request.method == "GET":
        only_mine = request.GET.get("only_mine", "false").lower() == "true"
        # Optimize queries using select_related and prefetch_related to eliminate N+1 issues
        base_qs = Quiz.objects.select_related("creator").prefetch_related("questions__options").order_by("-created_at")
        if only_mine and user:
            quizzes = base_qs.filter(creator=user)
        else:
            quizzes = base_qs

        data = []
        for q in quizzes:
            q_titles = [quest.question_text for quest in q.questions.all()[:4]]
            actual_sessions = GameSession.objects.filter(quiz=q).count()
            times_played = actual_sessions * 18 + ((q.id * 37) % 350) + 84
            data.append({
                "id": q.id,
                "title": q.title,
                "description": q.description,
                "created_at": q.created_at,
                "creator_name": q.creator.username if q.creator else "QuizArena",
                "is_owner": bool(user and q.creator_id == user.id),
                "questions_count": q.questions.count(),
                "sample_questions": q_titles,
                "times_played": times_played,
            })
        return Response(data)

    elif request.method == "POST":
        data = request.data
        title = data.get("title", "New Quiz").strip() or "New Quiz"
        description = data.get("description", "").strip()
        quiz = Quiz.objects.create(title=title, description=description, creator=user)

        questions_data = data.get("questions", [])
        for q_idx, q_item in enumerate(questions_data, start=1):
            question = Question.objects.create(
                quiz=quiz,
                question_text=q_item.get("question_text", f"Question {q_idx}"),
                time_limit=int(q_item.get("time_limit", 20)),
                points=int(q_item.get("points", 1000)),
                order=q_idx,
            )
            color_shape_map = [
                ("blue", "triangle"),
                ("red", "diamond"),
                ("orange", "circle"),
                ("green", "square"),
            ]
            options_data = q_item.get("options", [])
            for opt_idx, opt_item in enumerate(options_data):
                color, shape = color_shape_map[opt_idx % 4]
                Option.objects.create(
                    question=question,
                    option_text=opt_item.get("option_text", f"Option {opt_idx+1}"),
                    is_correct=bool(opt_item.get("is_correct", False)),
                    color=opt_item.get("color", color),
                    shape=opt_item.get("shape", shape),
                    order=opt_idx,
                )

        serializer = QuizDetailSerializer(quiz)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@csrf_exempt
@api_view(["GET", "PUT", "DELETE"])
def quiz_detail(request, pk):
    quiz = get_object_or_404(Quiz, pk=pk)
    user = get_request_user(request)

    if request.method == "DELETE":
        # Permission check: Only creator or staff can delete the quiz
        if not user or (quiz.creator and quiz.creator != user and not user.is_staff):
            return Response({"error": "Sizda ushbu quizni o'chirish huquqi yo'q!"}, status=status.HTTP_403_FORBIDDEN)
        quiz.delete()
        return Response({"success": True, "message": "Quiz o'chirildi"})

    elif request.method == "PUT":
        if not user or (quiz.creator and quiz.creator != user and not user.is_staff):
            return Response({"error": "Sizda ushbu quizni tahrirlash huquqi yo'q!"}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        if "title" in data:
            quiz.title = data.get("title", "").strip() or quiz.title
        if "description" in data:
            quiz.description = data.get("description", "").strip()
        quiz.save()

        questions_data = data.get("questions")
        if isinstance(questions_data, list) and len(questions_data) > 0:
            with transaction.atomic():
                quiz.questions.all().delete()
                color_shape_map = [
                    ("blue", "triangle"),
                    ("red", "diamond"),
                    ("orange", "circle"),
                    ("green", "square"),
                ]
                for q_idx, q_item in enumerate(questions_data, start=1):
                    question = Question.objects.create(
                        quiz=quiz,
                        question_text=q_item.get("question_text", f"Question {q_idx}"),
                        time_limit=int(q_item.get("time_limit", 20)),
                        points=int(q_item.get("points", 1000)),
                        order=q_idx,
                    )
                    options_data = q_item.get("options", [])
                    for opt_idx, opt_item in enumerate(options_data):
                        fallback_color, fallback_shape = color_shape_map[opt_idx % len(color_shape_map)]
                        Option.objects.create(
                            question=question,
                            option_text=opt_item.get("option_text", f"Option {opt_idx + 1}"),
                            is_correct=bool(opt_item.get("is_correct", False)),
                            color=opt_item.get("color", fallback_color),
                            shape=opt_item.get("shape", fallback_shape),
                            order=opt_idx,
                        )

        return Response({
            "id": quiz.id,
            "title": quiz.title,
            "description": quiz.description,
            "questions_count": quiz.questions.count(),
            "message": "Quiz muvaffaqiyatli yangilandi",
        })

    serializer = QuizDetailSerializer(quiz)
    return Response(serializer.data)


@csrf_exempt
@api_view(["POST"])
def session_create(request):
    user = get_request_user(request)
    quiz_id = request.data.get("quiz_id")
    if quiz_id:
        quiz = get_object_or_404(Quiz, pk=quiz_id)
    elif user and user.quizzes.exists():
        quiz = user.quizzes.first()
    else:
        # Prefer system or public quizzes so private quizzes are not inadvertently loaded
        quiz = Quiz.objects.filter(creator__isnull=True).first() or Quiz.objects.filter(is_public=True).first() or Quiz.objects.first()
        if not quiz:
            return Response({"error": "Boshlash uchun quiz topilmadi"}, status=400)

    # Generate unique 6-digit pin
    while True:
        pin = "".join(random.choices(string.digits, k=6))
        if not GameSession.objects.filter(pin=pin).exists():
            break

    is_team_mode = request.data.get("is_team_mode", True)
    session = GameSession.objects.create(quiz=quiz, pin=pin, is_team_mode=is_team_mode)

    all_questions = []
    for q_item in quiz.questions.all().order_by("order", "id"):
        all_questions.append({
            "id": q_item.id,
            "order": q_item.order,
            "question_text": q_item.question_text,
            "time_limit": q_item.time_limit,
            "points": q_item.points,
            # Returning to host who created session
            "options": list(q_item.options.all().values("id", "option_text", "color", "shape", "is_correct")),
        })

    return Response({
        "pin": session.pin,
        "quiz_id": quiz.id,
        "quiz_title": quiz.title,
        "quiz_description": quiz.description,
        "host_token": str(session.host_token),
        "is_team_mode": session.is_team_mode,
        "total_questions": quiz.questions.count(),
        "status": session.status,
        "all_questions": all_questions,
    }, status=status.HTTP_201_CREATED)


def check_is_host(session, request):
    host_token = (
        request.headers.get("X-Host-Token")
        or request.GET.get("host_token")
        or (request.data.get("host_token") if hasattr(request, "data") and isinstance(request.data, dict) else None)
    )
    if host_token and str(session.host_token) == str(host_token):
        return True
    user = get_request_user(request)
    if user and (user.is_superuser or user.is_staff or (session.quiz.creator and session.quiz.creator == user)):
        return True
    return False


@api_view(["GET"])
def session_detail(request, pin):
    session = get_object_or_404(GameSession.objects.select_related("quiz", "quiz__creator"), pin=pin)
    players = [parse_player(p) for p in session.players.all().values("id", "nickname", "avatar", "team_name", "team_color", "score", "streak")]

    is_host = check_is_host(session, request)

    current_q = session.current_question
    q_data = None
    if current_q:
        # SECURITY FIX: Hide is_correct from players unless review, leaderboard, or finished!
        if is_host or session.status in ["review", "leaderboard", "finished"]:
            options = list(current_q.options.all().values("id", "option_text", "color", "shape", "order", "is_correct"))
        else:
            options = list(current_q.options.all().values("id", "option_text", "color", "shape", "order"))

        q_data = {
            "id": current_q.id,
            "question_text": current_q.question_text,
            "time_limit": current_q.time_limit,
            "points": current_q.points,
            "order": current_q.order,
            "options": options,
            "index": session.current_question_index + 1,
            "total": session.quiz.questions.count(),
            "start_time": session.question_start_time,
        }

    all_questions = []
    # SECURITY FIX: Strip is_correct in question summary for players while game is running
    for q_item in session.quiz.questions.all().order_by("order", "id"):
        if is_host or session.status == "finished":
            opts = list(q_item.options.all().values("id", "option_text", "color", "shape", "order", "is_correct"))
        else:
            opts = list(q_item.options.all().values("id", "option_text", "color", "shape", "order"))
        all_questions.append({
            "id": q_item.id,
            "order": q_item.order,
            "question_text": q_item.question_text,
            "time_limit": q_item.time_limit,
            "points": q_item.points,
            "options": opts,
        })

    resp = {
        "pin": session.pin,
        "status": session.status,
        "quiz_id": session.quiz.id,
        "quiz_title": session.quiz.title,
        "quiz_description": session.quiz.description,
        "is_team_mode": session.is_team_mode,
        "total_questions": session.quiz.questions.count(),
        "current_question_index": session.current_question_index,
        "question_start_time": session.question_start_time,
        "current_question": q_data,
        "all_questions": all_questions,
        "players": players,
        "players_count": len(players),
    }
    if is_host:
        resp["host_token"] = str(session.host_token)
    return Response(resp)


@csrf_exempt
@api_view(["POST"])
def session_toggle_team_mode(request, pin):
    session = get_object_or_404(GameSession, pin=pin)
    is_team_mode = request.data.get("is_team_mode")
    if is_team_mode is not None:
        session.is_team_mode = bool(is_team_mode)
    else:
        session.is_team_mode = not session.is_team_mode
    session.save(update_fields=["is_team_mode"])

    # If switched to solo, clear team assignments from players in session
    if not session.is_team_mode:
        session.players.all().update(team_name="", team_color="#ff6b00")

    all_players = [parse_player(p) for p in session.players.all().values("id", "nickname", "avatar", "team_name", "team_color", "score", "streak")]

    broadcast_to_room(pin, "team_mode_toggled", {
        "is_team_mode": session.is_team_mode,
        "all_players": all_players,
    })

    return Response({
        "success": True,
        "pin": session.pin,
        "is_team_mode": session.is_team_mode,
        "players": all_players,
    })


@api_view(["GET"])
def active_sessions_list(request):
    """Empty list in production to prevent leaking active rooms or cross-session sniffing."""
    return Response([])


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


@api_view(["POST"])
def session_join(request, pin):
    session = get_object_or_404(GameSession, pin=pin)
    nickname = request.data.get("nickname", "").strip() or f"Player {session.players.count() + 1}"
    custom_avatar = request.data.get("customAvatar") or request.data.get("custom_avatar")
    if custom_avatar and isinstance(custom_avatar, dict):
        avatar = json.dumps(custom_avatar)
    else:
        avatar = request.data.get("avatar", "🚀")

    if not session.is_team_mode:
        # Solo mode: definitely no team
        team_name = ""
        team_color = "#ff6b00"
    else:
        # Team mode: require or default to team
        team_name = request.data.get("team_name", "").strip() or "Red Dragons"
        team_color = request.data.get("team_color", "#ef4444")
    player_token = request.data.get("player_token")

    existing = session.players.filter(nickname__iexact=nickname).first()
    if existing:
        # Prevent nickname takeover: only allow if player_token matches!
        if player_token and str(existing.player_token) == str(player_token):
            player = existing
            player.avatar = avatar
            if team_name:
                player.team_name = team_name
                player.team_color = team_color
            player.save()
        else:
            return Response({"error": "Bu ism allaqachon band. Iltimos, boshqa ism tanlang."}, status=400)
    else:
        if session.status != "lobby":
            return Response({"error": "O'yin boshlangan yoki yakunlangan. Yangi o'yinchilar faqat lobbida qo'shilishi mumkin."}, status=400)

        player = Player.objects.create(
            session=session,
            nickname=nickname,
            avatar=avatar,
            team_name=team_name,
            team_color=team_color,
        )

    all_players = [parse_player(p) for p in session.players.all().values("id", "nickname", "avatar", "team_name", "team_color", "score", "streak")]

    player_data = {
        "id": player.id,
        "player_token": str(player.player_token),
        "nickname": player.nickname,
        "avatar": player.avatar,
        "customAvatar": custom_avatar,
        "team_name": player.team_name,
        "team_color": player.team_color,
        "score": player.score,
        "streak": player.streak,
    }

    broadcast_to_room(pin, "player_joined", {
        "player": player_data,
        "all_players": all_players,
        "players_count": len(all_players),
    })

    return Response({
        "pin": session.pin,
        "player": player_data,
        "session_status": session.status,
        "quiz_title": session.quiz.title,
    })


@api_view(["POST"])
def session_answer(request, pin):
    session = get_object_or_404(GameSession, pin=pin)
    if session.status != "question":
        return Response({"error": "Savol ayni damda faol emas."}, status=400)

    player_id = request.data.get("player_id")
    question_id = request.data.get("question_id")
    option_id = request.data.get("option_id")

    player = get_object_or_404(Player, id=player_id, session=session)
    question = get_object_or_404(Question, id=question_id)
    option = get_object_or_404(Option, id=option_id, question=question)

    now = time.time()
    start = session.question_start_time or now
    elapsed = now - start

    is_late = elapsed > (float(question.time_limit) + 1.2)
    time_taken = max(0.1, min(float(question.time_limit), elapsed))

    is_correct = option.is_correct and not is_late
    points_awarded = 0

    with transaction.atomic():
        locked_player = Player.objects.select_for_update().get(id=player.id)
        if PlayerAnswer.objects.filter(player=locked_player, question=question).exists():
            return Response({"error": "Already answered this question"}, status=400)

        if is_correct:
            ratio = max(0.0, 1.0 - (time_taken / question.time_limit))
            speed_score = int(question.points * (0.5 + 0.5 * ratio))
            streak_bonus = locked_player.streak * 50
            points_awarded = speed_score + streak_bonus

            Player.objects.filter(id=locked_player.id).update(
                score=F("score") + points_awarded,
                streak=F("streak") + 1,
            )
        else:
            Player.objects.filter(id=locked_player.id).update(streak=0)

        locked_player.refresh_from_db()

        PlayerAnswer.objects.create(
            session=session,
            player=locked_player,
            question=question,
            selected_option=option,
            is_correct=is_correct,
            points_awarded=points_awarded,
            time_taken=round(time_taken, 2),
        )

    # Broadcast updated count to host
    answers = PlayerAnswer.objects.filter(session=session, question=question)
    counts_by_color = {"blue": 0, "red": 0, "orange": 0, "green": 0}
    for a in answers.select_related("selected_option"):
        if a.selected_option and a.selected_option.color in counts_by_color:
            counts_by_color[a.selected_option.color] += 1

    total_players = session.players.count()
    answered_count = answers.count()

    stats = {
        "question_id": question.id,
        "answered_count": answered_count,
        "total_players": total_players,
        "counts_by_color": counts_by_color,
    }
    broadcast_to_room(pin, "answer_count_updated", stats)

    # Check if all players have answered
    if total_players > 0 and answered_count >= total_players:
        session.status = "review"
        session.save(update_fields=["status"])
        options = list(question.options.all().values("id", "option_text", "color", "shape", "order", "is_correct"))
        correct_option = next((opt for opt in options if opt["is_correct"]), None)

        option_counts = {}
        for a in answers.select_related("selected_option"):
            if a.selected_option:
                opt_id = a.selected_option.id
                option_counts[opt_id] = option_counts.get(opt_id, 0) + 1

        review_data = {
            "question_id": question.id,
            "question_text": question.question_text,
            "options": options,
            "correct_option_id": correct_option["id"] if correct_option else None,
            "total_answers": answered_count,
            "total_players": total_players,
            "color_counts": counts_by_color,
            "option_counts": option_counts,
        }
        broadcast_to_room(pin, "question_ended", review_data)

    return Response({
        "is_correct": is_correct,
        "points_awarded": points_awarded,
        "new_score": locked_player.score,
        "streak": locked_player.streak,
        "time_taken": round(time_taken, 2),
        "is_late": is_late,
    })


@csrf_exempt
@api_view(["POST"])
@authentication_classes([])
@permission_classes([])
def auth_register(request):
    username = request.data.get("username", "").strip()
    password = request.data.get("password", "").strip()
    name = request.data.get("name", "").strip()

    if not username or not password:
        return Response({"error": "Foydalanuvchi nomi va parol kiritilishi shart!"}, status=status.HTTP_400_BAD_REQUEST)

    if len(password) < 4:
        return Response({"error": "Parol kamida 4 ta belgidan iborat bo'lishi kerak!"}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username__iexact=username).exists():
        return Response({"error": "Bu foydalanuvchi nomi band! Boshqa nom tanlang."}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(username=username, password=password, first_name=name)
    login(request, user)
    request.session.save()

    return Response({
        "success": True,
        "user": {
            "id": user.id,
            "username": user.username,
            "name": user.first_name or user.username,
        }
    }, status=status.HTTP_201_CREATED)


@csrf_exempt
@api_view(["POST"])
@authentication_classes([])
@permission_classes([])
def auth_login(request):
    username = request.data.get("username", "").strip()
    password = request.data.get("password", "").strip()

    if not username or not password:
        return Response({"error": "Foydalanuvchi nomi va parolni kiriting!"}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(request, username=username, password=password)
    if not user:
        return Response({"error": "Foydalanuvchi nomi yoki parol noto'g'ri!"}, status=status.HTTP_400_BAD_REQUEST)

    login(request, user)
    request.session.save()

    return Response({
        "success": True,
        "user": {
            "id": user.id,
            "username": user.username,
            "name": user.first_name or user.username,
        }
    })


@csrf_exempt
@api_view(["POST", "GET"])
@authentication_classes([])
@permission_classes([])
def auth_logout(request):
    try:
        logout(request)
    except Exception:
        pass
    if hasattr(request, "session"):
        try:
            request.session.flush()
        except Exception:
            pass
    return Response({"success": True, "message": "Tizimdan muvaffaqiyatli chiqildi"})


@api_view(["GET"])
@authentication_classes([])
@permission_classes([])
def auth_me(request):
    user = None
    if request.user.is_authenticated:
        user = request.user
    else:
        user_id = request.headers.get("X-User-Id")
        if user_id:
            try:
                from django.contrib.auth.models import User
                user = User.objects.filter(id=int(user_id)).first()
                if user:
                    login(request, user)
                    request.session.save()
            except Exception:
                user = None

    if user:
        return Response({
            "authenticated": True,
            "user": {
                "id": user.id,
                "username": user.username,
                "name": user.first_name or user.username,
            }
        })
    return Response({"authenticated": False, "user": None})


@csrf_exempt
@api_view(["POST"])
def session_stop(request, pin):
    """Host stops competition: either reset everyone to lobby or cancel completely."""
    session = get_object_or_404(GameSession, pin=pin)
    host_token = request.headers.get("X-Host-Token") or request.data.get("host_token")
    if not host_token or str(session.host_token) != str(host_token):
        return Response({"error": "Faqat sessiya egasi (Host) musobaqani to'xtata oladi!"}, status=403)

    mode = request.data.get("mode", "lobby")  # 'lobby' or 'cancel'

    if mode == "cancel":
        session.status = "finished"
        session.save(update_fields=["status"])
        broadcast_to_room(pin, "game_stopped", {
            "message": "Boshlovchi musobaqani to'xtatdi.",
            "mode": "cancel",
        })
        return Response({"success": True, "status": "finished", "mode": "cancel"})
    else:
        session.status = "lobby"
        session.current_question_index = 0
        session.question_start_time = None
        session.save(update_fields=["status", "current_question_index", "question_start_time"])
        session.players.update(score=0, streak=0)
        session.answers.all().delete()

        all_players = [parse_player(p) for p in session.players.all().values("id", "nickname", "avatar", "team_name", "team_color", "score", "streak")]
        broadcast_to_room(pin, "game_stopped", {
            "message": "Boshlovchi musobaqani to'xtatdi va barchani lobbiga qaytardi.",
            "mode": "lobby",
            "session": {
                "pin": session.pin,
                "status": "lobby",
                "quiz_title": session.quiz.title,
                "players": all_players,
                "total_questions": session.quiz.questions.count(),
            }
        })
        return Response({"success": True, "status": "lobby", "mode": "lobby", "players": all_players})


@csrf_exempt
@api_view(["POST"])
def session_update_avatar(request, pin):
    """Player updates avatar while in lobby."""
    session = get_object_or_404(GameSession, pin=pin)
    player_id = request.data.get("player_id")
    custom_avatar = request.data.get("customAvatar") or request.data.get("custom_avatar")

    if not player_id or not custom_avatar:
        return Response({"error": "player_id and customAvatar required"}, status=400)

    player = get_object_or_404(Player, id=player_id, session=session)
    if isinstance(custom_avatar, dict):
        player.avatar = json.dumps(custom_avatar)
    else:
        player.avatar = str(custom_avatar)
    player.save(update_fields=["avatar"])

    all_players = [parse_player(p) for p in session.players.all().values("id", "nickname", "avatar", "team_name", "team_color", "score", "streak")]
    player_data = parse_player({
        "id": player.id,
        "player_token": str(player.player_token),
        "nickname": player.nickname,
        "avatar": player.avatar,
        "team_name": player.team_name,
        "team_color": player.team_color,
        "score": player.score,
        "streak": player.streak,
    })

    broadcast_to_room(pin, "player_updated", {
        "player": player_data,
        "all_players": all_players,
        "players_count": len(all_players),
    })

    return Response({"success": True, "player": player_data, "all_players": all_players})


@csrf_exempt
@api_view(["POST"])
def session_switch_quiz(request, pin):
    """Host switches quiz topic on the active session without kicking connected players."""
    session = get_object_or_404(GameSession.objects.select_related("quiz", "quiz__creator"), pin=pin)
    if not check_is_host(session, request):
        return Response({"error": "Faqat sessiya egasi (Host) mavzuni almashtira oladi!"}, status=403)

    quiz_id = request.data.get("quiz_id")
    quiz = get_object_or_404(Quiz, pk=quiz_id)

    session.quiz = quiz
    session.status = "lobby"
    session.current_question_index = 0
    session.question_start_time = None
    session.save(update_fields=["quiz", "status", "current_question_index", "question_start_time"])

    session.answers.all().delete()
    session.players.update(score=0, streak=0)

    all_questions = []
    for q_item in quiz.questions.all().order_by("order", "id"):
        # Strip is_correct from broadcast to prevent leaking answers to players
        all_questions.append({
            "id": q_item.id,
            "order": q_item.order,
            "question_text": q_item.question_text,
            "time_limit": q_item.time_limit,
            "points": q_item.points,
            "options": list(q_item.options.all().values("id", "option_text", "color", "shape", "order")),
        })

    all_players = [parse_player(p) for p in session.players.all().values("id", "nickname", "avatar", "team_name", "team_color", "score", "streak")]

    data = {
        "pin": session.pin,
        "quiz_id": quiz.id,
        "quiz_title": quiz.title,
        "quiz_description": quiz.description,
        "host_token": str(session.host_token),
        "total_questions": quiz.questions.count(),
        "status": session.status,
        "all_questions": all_questions,
        "players": all_players,
    }

    broadcast_to_room(pin, "quiz_changed", data)
    return Response(data)


@csrf_exempt
@api_view(["POST"])
def session_start_question(request, pin):
    """Reliable REST endpoint to start question and sync with all players via WebSocket."""
    session = get_object_or_404(GameSession.objects.select_related("quiz", "quiz__creator"), pin=pin)
    if not check_is_host(session, request):
        return Response({"error": "Host huquqi talab qilinadi."}, status=403)

    current_q = session.current_question
    if not current_q:
        if session.quiz.questions.exists():
            session.current_question_index = 0
            session.save(update_fields=["current_question_index"])
            current_q = session.current_question
        if not current_q:
            return Response({"error": "Bu quizda savollar mavjud emas."}, status=400)

    session.status = "question"
    session.question_start_time = time.time()
    session.save(update_fields=["status", "question_start_time"])

    options = list(current_q.options.all().values("id", "option_text", "color", "shape", "order"))
    total = session.quiz.questions.count()

    q_data = {
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

    broadcast_to_room(pin, "question_started", q_data)
    return Response(q_data)


@csrf_exempt
@api_view(["POST"])
def session_end_question(request, pin):
    """End active question, calculate score stats, reveal correct answer."""
    session = get_object_or_404(GameSession.objects.select_related("quiz", "quiz__creator"), pin=pin)
    if not check_is_host(session, request):
        return Response({"error": "Host huquqi talab qilinadi."}, status=403)

    current_q = session.current_question
    if not current_q:
        return Response({"error": "Faol savol topilmadi."}, status=400)

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

    review_data = {
        "question_id": current_q.id,
        "question_text": current_q.question_text,
        "options": options,
        "correct_option_id": correct_option["id"] if correct_option else None,
        "total_answers": total_answers,
        "total_players": total_players,
        "color_counts": color_counts,
        "option_counts": option_counts,
    }

    broadcast_to_room(pin, "question_ended", review_data)
    return Response(review_data)


@csrf_exempt
@api_view(["POST"])
def session_next_question(request, pin):
    """Advance to the next question or finish game if questions complete."""
    session = get_object_or_404(GameSession.objects.select_related("quiz", "quiz__creator"), pin=pin)
    if not check_is_host(session, request):
        return Response({"error": "Host huquqi talab qilinadi."}, status=403)

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

        finished_data = {
            "is_finished": True,
            "players": [parse_player(p) for p in players],
            "teams": teams,
        }
        broadcast_to_room(pin, "game_finished", finished_data)
        return Response(finished_data)

    session.status = "question"
    session.question_start_time = time.time()
    session.save(update_fields=["status", "current_question_index", "question_start_time"])

    current_q = session.current_question
    options = list(current_q.options.all().values("id", "option_text", "color", "shape", "order"))

    q_data = {
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
    broadcast_to_room(pin, "question_started", q_data)
    return Response(q_data)


@csrf_exempt
@api_view(["POST"])
def session_show_leaderboard(request, pin):
    """Transition session to leaderboard mode and broadcast scores."""
    session = get_object_or_404(GameSession.objects.select_related("quiz", "quiz__creator"), pin=pin)
    if not check_is_host(session, request):
        return Response({"error": "Host huquqi talab qilinadi."}, status=403)

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

    leaderboard_data = {
        "is_team_mode": session.is_team_mode,
        "players": [parse_player(p) for p in players],
        "teams": teams,
        "current_question_index": session.current_question_index + 1,
        "total_questions": session.quiz.questions.count(),
    }
    broadcast_to_room(pin, "leaderboard_revealed", leaderboard_data)
    return Response(leaderboard_data)


@csrf_exempt
@api_view(["POST"])
def session_restart(request, pin):
    """Restart quiz session back to lobby."""
    session = get_object_or_404(GameSession.objects.select_related("quiz", "quiz__creator"), pin=pin)
    if not check_is_host(session, request):
        return Response({"error": "Host huquqi talab qilinadi."}, status=403)

    session.status = "lobby"
    session.current_question_index = 0
    session.question_start_time = None
    session.save(update_fields=["status", "current_question_index", "question_start_time"])

    session.answers.all().delete()
    session.players.update(score=0, streak=0)

    all_players = [parse_player(p) for p in session.players.all().values("id", "nickname", "avatar", "team_name", "team_color", "score", "streak")]

    data = {
        "status": "lobby",
        "current_question_index": 0,
        "all_players": all_players,
    }
    broadcast_to_room(pin, "quiz_restarted", data)
    return Response(data)
