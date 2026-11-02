import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quiz_backend.settings")
django.setup()

from django.contrib.auth.models import User
from django.contrib.sessions.models import Session
from quiz_app.models import Quiz, Question, Option, GameSession, Player, PlayerAnswer

QUIZ_DATA = {
  "title": "Linking Words Quiz",
  "timeLimit": 20,
  "description": "English Grammar: Test your knowledge of linking words and conjunctions (although, unless, whereas, so that, etc.)",
  "questions": [
    {"id": 1, "question": "He achieved success ____ hard work.", "options": ["although", "through", "unless", "whereas"], "answer": 1},
    {"id": 2, "question": "____ it was raining, we played football.", "options": ["Unless", "So that", "Although", "In case"], "answer": 2},
    {"id": 3, "question": "Tom is tall, ____ his brother is short.", "options": ["whereas", "unless", "since", "so that"], "answer": 0},
    {"id": 4, "question": "____ she was very tired, she finished the project.", "options": ["Unless", "In case", "Provided that", "Even though"], "answer": 3},
    {"id": 5, "question": "I haven't seen him ____ last summer.", "options": ["while", "since", "unless", "although"], "answer": 1},
    {"id": 6, "question": "You can't enter the club ____ you have a ticket.", "options": ["although", "whereas", "unless", "through"], "answer": 2},
    {"id": 7, "question": "____ I was cooking, my sister was cleaning the house.", "options": ["Unless", "In case", "While", "So that"], "answer": 2},
    {"id": 8, "question": "You can borrow my car ____ you drive carefully.", "options": ["although", "provided that", "whereas", "even though"], "answer": 1},
    {"id": 9, "question": "Take an umbrella ____ it rains later.", "options": ["in case", "unless", "although", "whereas"], "answer": 0},
    {"id": 10, "question": "I study hard ____ I can get a good job.", "options": ["although", "unless", "since", "so that"], "answer": 3},
    {"id": 11, "question": "____ he had no money, he bought a gift for his mother.", "options": ["Even though", "Unless", "So that", "In case"], "answer": 0},
    {"id": 12, "question": "____ it was late, we took a taxi home.", "options": ["Unless", "Since", "Whereas", "Although"], "answer": 1},
    {"id": 13, "question": "I will be late ____ the bus comes soon.", "options": ["unless", "although", "whereas", "through"], "answer": 0},
    {"id": 14, "question": "The river flows ____ the center of the city.", "options": ["since", "unless", "through", "while"], "answer": 2},
    {"id": 15, "question": "Some people prefer tea, ____ others prefer coffee.", "options": ["whereas", "unless", "in case", "so that"], "answer": 0},
    {"id": 16, "question": "____ I like pizza, my friend prefers pasta.", "options": ["Unless", "While", "In case", "So that"], "answer": 1},
    {"id": 17, "question": "You can go out ____ you finish your homework first.", "options": ["Although", "Whereas", "Unless", "Provided that"], "answer": 3},
    {"id": 18, "question": "Write down my number ____ you forget it.", "options": ["so that", "in case", "unless", "whereas"], "answer": 1},
    {"id": 19, "question": "He spoke slowly ____ everyone could understand him.", "options": ["unless", "in case", "so that", "although"], "answer": 2},
    {"id": 20, "question": "Which sentence has the same meaning as: \"Unless you hurry, you will miss the train.\"?", "options": ["If you hurry, you will miss the train.", "If you don't hurry, you will miss the train.", "Because you hurry, you will miss the train.", "Although you hurry, you will miss the train."], "answer": 1},
    {"id": 21, "question": "Which sentence is correct?", "options": ["Although he was ill, but he went to work.", "Although he was ill, he went to work.", "Although he was ill, so he went to work.", "Although he was ill, and he went to work."], "answer": 1},
    {"id": 22, "question": "What does \"Even though it was cold, he swam\" mean?", "options": ["He swam because it was cold.", "He swam when it was cold.", "It was cold, but he swam anyway.", "He didn't swim because of the cold."], "answer": 2},
    {"id": 23, "question": "She has lived here ____ 2015.", "options": ["since", "while", "unless", "whereas"], "answer": 0},
    {"id": 24, "question": "I'll take a sandwich ____ I get hungry later.", "options": ["although", "in case", "whereas", "unless"], "answer": 1},
    {"id": 25, "question": "He walked ____ the tunnel to reach the other side.", "options": ["through", "since", "unless", "whereas"], "answer": 0},
    {"id": 26, "question": "____ you study, you won't pass the test.", "options": ["Whereas", "Provided that", "Unless", "So that"], "answer": 2},
    {"id": 27, "question": "My sister loves sports, ____ I prefer reading.", "options": ["unless", "whereas", "in case", "since"], "answer": 1},
    {"id": 28, "question": "Speak quietly ____ the baby doesn't wake up.", "options": ["so that", "unless", "although", "since"], "answer": 0},
    {"id": 29, "question": "____ he is rich, he is not happy.", "options": ["Provided that", "Unless", "Although", "So that"], "answer": 2},
    {"id": 30, "question": "I'll lend you the money ____ you pay it back next week.", "options": ["although", "whereas", "provided that", "in case"], "answer": 2}
  ]
}

COLORS = ["red", "blue", "orange", "green"]
SHAPES = ["triangle", "diamond", "circle", "square"]

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

    print(f"3. Admin uchun '{QUIZ_DATA['title']}' yaratilmoqda...")
    quiz = Quiz.objects.create(
        creator=admin_user,
        title=QUIZ_DATA["title"],
        description=QUIZ_DATA["description"],
        is_public=True
    )

    print(f"4. {len(QUIZ_DATA['questions'])} ta savol va variantlar yaratilmoqda...")
    for idx, q_data in enumerate(QUIZ_DATA["questions"], start=1):
        question = Question.objects.create(
            quiz=quiz,
            question_text=q_data["question"],
            time_limit=QUIZ_DATA.get("timeLimit", 20),
            points=1000,
            order=idx,
        )

        for opt_idx, opt_text in enumerate(q_data["options"]):
            Option.objects.create(
                question=question,
                option_text=opt_text,
                is_correct=(opt_idx == q_data["answer"]),
                color=COLORS[opt_idx % len(COLORS)],
                shape=SHAPES[opt_idx % len(SHAPES)],
                order=opt_idx,
            )

    print(f"Muvaffaqiyatli yakunlandi! Quiz ID: {quiz.id}, Savollar: {quiz.questions.count()}")

if __name__ == "__main__":
    reset_and_seed()
