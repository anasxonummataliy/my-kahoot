import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quiz_backend.settings")
django.setup()

from django.contrib.auth.models import User
from django.contrib.sessions.models import Session
from quiz_app.models import Quiz, Question, Option, GameSession, Player, PlayerAnswer

def reset_and_seed():
    print("1. Tozalanmoqda...")
    PlayerAnswer.objects.all().delete()
    Player.objects.all().delete()
    GameSession.objects.all().delete()
    Option.objects.all().delete()
    Question.objects.all().delete()
    Quiz.objects.all().delete()
    Session.objects.all().delete()
    User.objects.all().delete()
    print("Database to'liq tozalandi.")

    print("2. 'admin' foydalanuvchisi yaratilmoqda...")
    admin_user = User.objects.create_superuser(
        username="admin",
        password="qwerty",
        email="admin@example.com",
        first_name="Admin",
    )
    print(f"Foydalanuvchi yaratildi: {admin_user.username} (parol: qwerty)")

    print("3. Admin uchun quizlar va savollar yaratilmoqda...")
    quiz1 = Quiz.objects.create(
        creator=admin_user,
        title="IT & Dasturlash Bilimlari 🚀",
        description="Dasturlash, Web texnologiyalari va umumiy IT bo'yicha qiziqarli savollar to'plami.",
        is_public=True
    )

    questions_data = [
        {
            "text": "Python dasturlash tilining asoschisi kim?",
            "time_limit": 20,
            "points": 1000,
            "options": [
                {"text": "Guido van Rossum", "is_correct": True, "color": "red", "shape": "triangle"},
                {"text": "Brendan Eich", "is_correct": False, "color": "blue", "shape": "diamond"},
                {"text": "James Gosling", "is_correct": False, "color": "orange", "shape": "circle"},
                {"text": "Dennis Ritchie", "is_correct": False, "color": "green", "shape": "square"},
            ]
        },
        {
            "text": "Web sahifalarning asosi va skeletini yaratish uchun qaysi texnologiya ishlatiladi?",
            "time_limit": 20,
            "points": 1000,
            "options": [
                {"text": "CSS", "is_correct": False, "color": "red", "shape": "triangle"},
                {"text": "HTML", "is_correct": True, "color": "blue", "shape": "diamond"},
                {"text": "JavaScript", "is_correct": False, "color": "orange", "shape": "circle"},
                {"text": "Python", "is_correct": False, "color": "green", "shape": "square"},
            ]
        },
        {
            "text": "Frontend va Backend o'rtasida real-vaqtda ikki tomonlama tezkor aloqa uchun nima ishlatiladi?",
            "time_limit": 20,
            "points": 1000,
            "options": [
                {"text": "FTP", "is_correct": False, "color": "red", "shape": "triangle"},
                {"text": "SMTP", "is_correct": False, "color": "blue", "shape": "diamond"},
                {"text": "WebSocket", "is_correct": True, "color": "orange", "shape": "circle"},
                {"text": "DNS", "is_correct": False, "color": "green", "shape": "square"},
            ]
        },
        {
            "text": "CSS da elementni sahifaning qoq markaziga joylashtirishning eng zamonaviy va oson usuli qaysi?",
            "time_limit": 20,
            "points": 1000,
            "options": [
                {"text": "float: center;", "is_correct": False, "color": "red", "shape": "triangle"},
                {"text": "margin-left: 50%;", "is_correct": False, "color": "blue", "shape": "diamond"},
                {"text": "display: flex; justify-content: center; align-items: center;", "is_correct": True, "color": "green", "shape": "square"},
                {"text": "position: static;", "is_correct": False, "color": "orange", "shape": "circle"},
            ]
        },
        {
            "text": "Git versiya boshqaruv tizimida o'zgarishlarni serverga (remote) yuborish buyrug'i nima?",
            "time_limit": 20,
            "points": 1000,
            "options": [
                {"text": "git push", "is_correct": True, "color": "red", "shape": "triangle"},
                {"text": "git commit", "is_correct": False, "color": "blue", "shape": "diamond"},
                {"text": "git pull", "is_correct": False, "color": "orange", "shape": "circle"},
                {"text": "git init", "is_correct": False, "color": "green", "shape": "square"},
            ]
        }
    ]

    for q_idx, q_data in enumerate(questions_data, start=1):
        q = Question.objects.create(
            quiz=quiz1,
            question_text=q_data["text"],
            time_limit=q_data["time_limit"],
            points=q_data["points"],
            order=q_idx
        )
        for opt_idx, opt_data in enumerate(q_data["options"]):
            Option.objects.create(
                question=q,
                option_text=opt_data["text"],
                is_correct=opt_data["is_correct"],
                color=opt_data["color"],
                shape=opt_data["shape"],
                order=opt_idx
            )

    print(f"Quiz yaratildi: '{quiz1.title}' ({quiz1.questions.count()} ta savol bilan)")

    # 2-quiz: Mantiqiy va Tezkor Savollar
    quiz2 = Quiz.objects.create(
        creator=admin_user,
        title="Mantiqiy va Tezkor Savollar ⚡",
        description="Fikr tezligini sinash uchun mantiqiy savollar.",
        is_public=True
    )
    quiz2_questions = [
        {
            "text": "Dunyo bo'yicha eng ko'p ishlatiladigan dasturlash tillari indeksida yetakchi o'rinda turuvchi til?",
            "time_limit": 15,
            "points": 1000,
            "options": [
                {"text": "Python", "is_correct": True, "color": "red", "shape": "triangle"},
                {"text": "Pascal", "is_correct": False, "color": "blue", "shape": "diamond"},
                {"text": "COBOL", "is_correct": False, "color": "orange", "shape": "circle"},
                {"text": "Fortran", "is_correct": False, "color": "green", "shape": "square"},
            ]
        },
        {
            "text": "1 bayt nechta bitga teng?",
            "time_limit": 15,
            "points": 1000,
            "options": [
                {"text": "4 bit", "is_correct": False, "color": "red", "shape": "triangle"},
                {"text": "8 bit", "is_correct": True, "color": "blue", "shape": "diamond"},
                {"text": "16 bit", "is_correct": False, "color": "orange", "shape": "circle"},
                {"text": "32 bit", "is_correct": False, "color": "green", "shape": "square"},
            ]
        },
        {
            "text": "O'zbekistonda IT-Park qaysi yili tashkil etilgan?",
            "time_limit": 15,
            "points": 1000,
            "options": [
                {"text": "2015-yil", "is_correct": False, "color": "red", "shape": "triangle"},
                {"text": "2017-yil", "is_correct": False, "color": "blue", "shape": "diamond"},
                {"text": "2019-yil", "is_correct": True, "color": "green", "shape": "square"},
                {"text": "2021-yil", "is_correct": False, "color": "orange", "shape": "circle"},
            ]
        }
    ]
    for q_idx, q_data in enumerate(quiz2_questions, start=1):
        q = Question.objects.create(
            quiz=quiz2,
            question_text=q_data["text"],
            time_limit=q_data["time_limit"],
            points=q_data["points"],
            order=q_idx
        )
        for opt_idx, opt_data in enumerate(q_data["options"]):
            Option.objects.create(
                question=q,
                option_text=opt_data["text"],
                is_correct=opt_data["is_correct"],
                color=opt_data["color"],
                shape=opt_data["shape"],
                order=opt_idx
            )
    print(f"2-Quiz yaratildi: '{quiz2.title}' ({quiz2.questions.count()} ta savol bilan)")
    print("\nBarcha amallar muvaffaqiyatli bajarildi!")

if __name__ == "__main__":
    reset_and_seed()
