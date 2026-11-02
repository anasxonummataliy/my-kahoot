import json
import time
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from .models import Quiz, Question, Option, GameSession, Player, PlayerAnswer


class QuizArenaTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="testadmin", password="password123")
        self.other_user = User.objects.create_user(username="otheruser", password="password123")

        self.quiz = Quiz.objects.create(
            title="Tarixiy Test",
            description="O'zbekiston tarixi",
            creator=self.user,
        )
        self.q1 = Question.objects.create(
            quiz=self.quiz,
            question_text="Amir Temur nechanchi yilda tug'ilgan?",
            time_limit=20,
            points=1000,
            order=1,
        )
        self.opt1 = Option.objects.create(
            question=self.q1,
            option_text="1336",
            is_correct=True,
            color="blue",
            shape="triangle",
            order=0,
        )
        self.opt2 = Option.objects.create(
            question=self.q1,
            option_text="1346",
            is_correct=False,
            color="red",
            shape="diamond",
            order=1,
        )

    def test_session_detail_hides_correct_answers_from_players(self):
        """Verify that is_correct is NOT leaked to players in session_detail while game is ongoing."""
        session = GameSession.objects.create(quiz=self.quiz, pin="123456", status="question")

        # 1. As regular player (no host token)
        res = self.client.get(f"/api/sessions/{session.pin}/")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        
        # In current_question options, is_correct must NOT be present
        for opt in data["current_question"]["options"]:
            self.assertNotIn("is_correct", opt)

        # In all_questions, is_correct must NOT be present
        for q in data["all_questions"]:
            for opt in q["options"]:
                self.assertNotIn("is_correct", opt)

        # 2. As host with valid host token header
        res_host = self.client.get(
            f"/api/sessions/{session.pin}/",
            HTTP_X_HOST_TOKEN=str(session.host_token),
        )
        self.assertEqual(res_host.status_code, 200)
        host_data = res_host.json()
        
        # Host CAN see is_correct
        has_is_correct = any("is_correct" in opt for opt in host_data["current_question"]["options"])
        self.assertTrue(has_is_correct)

    def test_nickname_theft_prevention(self):
        """Verify that another user cannot hijack an existing player's score and profile."""
        session = GameSession.objects.create(quiz=self.quiz, pin="222333", status="lobby")
        p1 = Player.objects.create(session=session, nickname="Anas", avatar="🚀")

        # Another player tries to join with the same nickname without matching player_token
        res = self.client.post(
            f"/api/sessions/{session.pin}/join/",
            {"nickname": "Anas", "avatar": "🐻"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("allaqachon band", res.json()["error"])

        # Reconnecting player with matching player_token should succeed
        res_reconnect = self.client.post(
            f"/api/sessions/{session.pin}/join/",
            {"nickname": "Anas", "player_token": str(p1.player_token)},
            format="json",
        )
        self.assertEqual(res_reconnect.status_code, 200)

    def test_prevent_joining_active_game(self):
        """New players cannot join once the game is already in progress."""
        session = GameSession.objects.create(quiz=self.quiz, pin="333444", status="question")
        res = self.client.post(
            f"/api/sessions/{session.pin}/join/",
            {"nickname": "Newbie", "avatar": "🚀"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("O'yin boshlangan", res.json()["error"])

    def test_late_answers_award_zero_points(self):
        """Late answers submitted after question expiry get 0 points."""
        session = GameSession.objects.create(
            quiz=self.quiz,
            pin="444555",
            status="question",
            question_start_time=time.time() - 30.0,  # 30 seconds ago, limit is 20s
        )
        player = Player.objects.create(session=session, nickname="Slowpoke", score=0)

        res = self.client.post(
            f"/api/sessions/{session.pin}/answer/",
            {
                "player_id": player.id,
                "question_id": self.q1.id,
                "option_id": self.opt1.id,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["points_awarded"], 0)
        self.assertTrue(data["is_late"])
        player.refresh_from_db()
        self.assertEqual(player.score, 0)

    def test_quiz_delete_permission(self):
        """Only the creator or admin can delete a quiz."""
        # Non-creator cannot delete
        self.client.force_authenticate(user=self.other_user)
        res = self.client.delete(f"/api/quizzes/{self.quiz.id}/")
        self.assertEqual(res.status_code, 403)
        self.assertTrue(Quiz.objects.filter(id=self.quiz.id).exists())

        # Creator can delete
        self.client.force_authenticate(user=self.user)
        res_ok = self.client.delete(f"/api/quizzes/{self.quiz.id}/")
        self.assertEqual(res_ok.status_code, 200)
        self.assertFalse(Quiz.objects.filter(id=self.quiz.id).exists())
