from rest_framework import serializers
from .models import Quiz, Question, Option, GameSession, Player, PlayerAnswer


class OptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Option
        fields = ["id", "option_text", "color", "shape", "order"]


class OptionReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Option
        fields = ["id", "option_text", "color", "shape", "order", "is_correct"]


class QuestionSerializer(serializers.ModelSerializer):
    options = OptionSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ["id", "question_text", "time_limit", "points", "order", "options"]


class QuestionDetailSerializer(serializers.ModelSerializer):
    options = OptionReviewSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ["id", "question_text", "time_limit", "points", "order", "options"]


class QuizListSerializer(serializers.ModelSerializer):
    questions_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Quiz
        fields = ["id", "title", "description", "questions_count", "created_at"]


class QuizDetailSerializer(serializers.ModelSerializer):
    questions = QuestionDetailSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = ["id", "title", "description", "questions", "created_at"]


class PlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Player
        fields = ["id", "nickname", "avatar", "team_name", "team_color", "score", "streak"]


class GameSessionSerializer(serializers.ModelSerializer):
    players = PlayerSerializer(many=True, read_only=True)
    players_count = serializers.SerializerMethodField()
    total_questions = serializers.IntegerField(read_only=True)
    quiz_title = serializers.CharField(source="quiz.title", read_only=True)
    quiz_description = serializers.CharField(source="quiz.description", read_only=True)

    class Meta:
        model = GameSession
        fields = [
            "pin",
            "quiz_id",
            "quiz_title",
            "quiz_description",
            "status",
            "is_team_mode",
            "current_question_index",
            "question_start_time",
            "players_count",
            "total_questions",
            "players",
            "created_at",
        ]

    def get_players_count(self, obj):
        return obj.players.count()
