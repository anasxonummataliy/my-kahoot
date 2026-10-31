import random
import string
import time
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
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


@api_view(["GET", "POST"])
def quiz_list_create(request):
    if request.method == "GET":
        quizzes = Quiz.objects.all().order_by("-created_at")
        serializer = QuizListSerializer(quizzes, many=True)
        return Response(serializer.data)

    elif request.method == "POST":
        data = request.data
        title = data.get("title", "New Quiz")
        description = data.get("description", "")
        quiz = Quiz.objects.create(title=title, description=description)

        questions_data = data.get("questions", [])
        for q_idx, q_item in enumerate(questions_data, start=1):
            question = Question.objects.create(
                quiz=quiz,
                question_text=q_item.get("question_text", f"Question {q_idx}"),
                time_limit=q_item.get("time_limit", 20),
                points=q_item.get("points", 1000),
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
                    is_correct=opt_item.get("is_correct", False),
                    color=opt_item.get("color", color),
                    shape=opt_item.get("shape", shape),
                    order=opt_idx,
                )

        serializer = QuizDetailSerializer(quiz)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
def quiz_detail(request, pk):
    quiz = get_object_or_404(Quiz, pk=pk)
    serializer = QuizDetailSerializer(quiz)
    return Response(serializer.data)


@api_view(["POST"])
def session_create(request):
    quiz_id = request.data.get("quiz_id")
    if quiz_id:
        quiz = get_object_or_404(Quiz, pk=quiz_id)
    else:
        quiz = Quiz.objects.first()
        if not quiz:
            return Response({"error": "No quiz available to start"}, status=400)

    # Generate 6-digit pin
    while True:
        pin = "".join(random.choices(string.digits, k=6))
        if not GameSession.objects.filter(pin=pin).exists():
            break

    is_team_mode = request.data.get("is_team_mode", True)
    session = GameSession.objects.create(quiz=quiz, pin=pin, is_team_mode=is_team_mode)

    return Response({
        "pin": session.pin,
        "quiz_id": quiz.id,
        "quiz_title": quiz.title,
        "quiz_description": quiz.description,
        "host_token": session.host_token,
        "is_team_mode": session.is_team_mode,
        "total_questions": quiz.questions.count(),
        "status": session.status,
    }, status=status.HTTP_201_CREATED)


@api_view(["GET"])
def session_detail(request, pin):
    session = get_object_or_404(GameSession.objects.select_related("quiz"), pin=pin)
    players = list(session.players.all().values("id", "nickname", "avatar", "team_name", "team_color", "score", "streak"))
    current_q = session.current_question
    q_data = None
    if current_q:
        if session.status in ["review", "leaderboard", "finished"]:
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
        }

    return Response({
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
        "players": players,
        "players_count": len(players),
    })


@api_view(["POST"])
def session_join(request, pin):
    session = get_object_or_404(GameSession, pin=pin)
    nickname = request.data.get("nickname", "").strip() or f"Player {session.players.count() + 1}"
    avatar = request.data.get("avatar", "🚀")
    team_name = request.data.get("team_name", "").strip()
    team_color = request.data.get("team_color", "#8b5cf6")

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

    all_players = list(session.players.all().values("id", "nickname", "avatar", "team_name", "team_color", "score", "streak"))
    
    player_data = {
        "id": player.id,
        "player_token": player.player_token,
        "nickname": player.nickname,
        "avatar": player.avatar,
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
    player_id = request.data.get("player_id")
    question_id = request.data.get("question_id")
    option_id = request.data.get("option_id")

    player = get_object_or_404(Player, id=player_id, session=session)
    question = get_object_or_404(Question, id=question_id)
    option = get_object_or_404(Option, id=option_id, question=question)

    existing = PlayerAnswer.objects.filter(player=player, question=question).first()
    if existing:
        return Response({"error": "Already answered this question"}, status=400)

    now = time.time()
    start = session.question_start_time or now
    time_taken = max(0.1, min(float(question.time_limit), now - start))

    is_correct = option.is_correct
    points_awarded = 0
    if is_correct:
        ratio = max(0.0, 1.0 - (time_taken / question.time_limit))
        speed_score = int(question.points * (0.5 + 0.5 * ratio))
        streak_bonus = player.streak * 50
        points_awarded = speed_score + streak_bonus
        player.score += points_awarded
        player.streak += 1
    else:
        player.streak = 0
    player.save()

    PlayerAnswer.objects.create(
        session=session,
        player=player,
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

    stats = {
        "question_id": question.id,
        "answered_count": answers.count(),
        "total_players": session.players.count(),
        "counts_by_color": counts_by_color,
    }
    broadcast_to_room(pin, "answer_count_updated", stats)

    return Response({
        "is_correct": is_correct,
        "points_awarded": points_awarded,
        "new_score": player.score,
        "streak": player.streak,
        "time_taken": round(time_taken, 2),
    })
