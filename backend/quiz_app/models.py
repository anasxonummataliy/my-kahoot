import random
import string
import uuid
from django.db import models


def generate_pin():
    return "".join(random.choices(string.digits, k=6))


class Quiz(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="Answer as fast and correctly as you can!")
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

    @property
    def questions_count(self):
        return self.questions.count()


class Question(models.Model):
    quiz = models.ForeignKey(Quiz, related_name="questions", on_delete=models.CASCADE)
    question_text = models.CharField(max_length=500)
    time_limit = models.PositiveIntegerField(default=20)  # in seconds
    points = models.PositiveIntegerField(default=1000)
    order = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.quiz.title} - Q{self.order}: {self.question_text[:30]}"


class Option(models.Model):
    COLOR_CHOICES = [
        ("blue", "Blue"),
        ("red", "Red"),
        ("orange", "Orange"),
        ("green", "Green"),
    ]
    SHAPE_CHOICES = [
        ("triangle", "Triangle"),
        ("diamond", "Diamond"),
        ("circle", "Circle"),
        ("square", "Square"),
    ]

    question = models.ForeignKey(Question, related_name="options", on_delete=models.CASCADE)
    option_text = models.CharField(max_length=300)
    is_correct = models.BooleanField(default=False)
    color = models.CharField(max_length=20, choices=COLOR_CHOICES, default="blue")
    shape = models.CharField(max_length=20, choices=SHAPE_CHOICES, default="triangle")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.option_text} ({self.color})"


class GameSession(models.Model):
    STATUS_CHOICES = [
        ("lobby", "Lobby"),
        ("question", "Question in Progress"),
        ("review", "Reviewing Answer"),
        ("leaderboard", "Leaderboard"),
        ("finished", "Finished"),
    ]

    pin = models.CharField(max_length=6, unique=True, default=generate_pin)
    quiz = models.ForeignKey(Quiz, related_name="sessions", on_delete=models.CASCADE)
    host_token = models.CharField(max_length=64, default=uuid.uuid4)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="lobby")
    is_team_mode = models.BooleanField(default=True)
    current_question_index = models.PositiveIntegerField(default=0)  # 0-indexed into ordered questions
    question_start_time = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Game PIN {self.pin} ({self.status}) - {self.quiz.title}"

    @property
    def current_question(self):
        questions = list(self.quiz.questions.all().order_by("order", "id"))
        if 0 <= self.current_question_index < len(questions):
            return questions[self.current_question_index]
        return None

    @property
    def total_questions(self):
        return self.quiz.questions.count()


class Player(models.Model):
    session = models.ForeignKey(GameSession, related_name="players", on_delete=models.CASCADE)
    player_token = models.CharField(max_length=64, default=uuid.uuid4)
    nickname = models.CharField(max_length=50)
    avatar = models.CharField(max_length=500, default="🚀")
    team_name = models.CharField(max_length=50, blank=True, default="")
    team_color = models.CharField(max_length=20, blank=True, default="#8b5cf6")
    score = models.IntegerField(default=0)
    streak = models.IntegerField(default=0)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-score", "joined_at"]

    def __str__(self):
        return f"{self.nickname} in {self.session.pin} (Score: {self.score})"


class PlayerAnswer(models.Model):
    session = models.ForeignKey(GameSession, related_name="answers", on_delete=models.CASCADE)
    player = models.ForeignKey(Player, related_name="answers", on_delete=models.CASCADE)
    question = models.ForeignKey(Question, related_name="answers", on_delete=models.CASCADE)
    selected_option = models.ForeignKey(Option, null=True, blank=True, on_delete=models.SET_NULL)
    is_correct = models.BooleanField(default=False)
    points_awarded = models.IntegerField(default=0)
    time_taken = models.FloatField(default=0.0)
    answered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("player", "question")

    def __str__(self):
        return f"{self.player.nickname} - Q{self.question.id} - {'Correct' if self.is_correct else 'Wrong'} (+{self.points_awarded})"
