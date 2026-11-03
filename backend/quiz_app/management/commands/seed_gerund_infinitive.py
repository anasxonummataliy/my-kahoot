from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from quiz_app.models import Option, Question, Quiz


QUESTIONS = [
    ("I enjoy ____ books in my free time.", ["read", "reading", "to read", "reads"], 1),
    ("She decided ____ a new language.", ["learning", "learn", "to learn", "learned"], 2),
    ("He avoids ____ late at night.", ["driving", "to drive", "drive", "drove"], 0),
    ("We hope ____ you again soon.", ["seeing", "see", "saw", "to see"], 3),
    ("They finished ____ the room.", ["clean", "to clean", "cleaning", "cleaned"], 2),
    ("I want ____ a doctor in the future.", ["becoming", "become", "to become", "became"], 2),
    ("Do you mind ____ the window?", ["to open", "opening", "open", "opened"], 1),
    ("He promised ____ me with my homework.", ["helping", "help", "to help", "helped"], 2),
    ("She is good at ____ difficult problems.", ["solve", "solving", "to solve", "solved"], 1),
    ("I would like ____ some advice.", ["getting", "get", "got", "to get"], 3),
    ("They suggested ____ a taxi.", ["taking", "to take", "take", "took"], 0),
    ("It is difficult ____ everything in one day.", ["finishing", "finish", "to finish", "finished"], 2),
    ("He stopped ____ because it was bad for his health.", ["smoke", "to smoke", "smoking", "smoked"], 2),
    ("Remember ____ the lights before you leave.", ["turning off", "turn off", "to turn off", "turned off"], 2),
    ("I am interested in ____ more about this subject.", ["learn", "to learn", "learning", "learned"], 2),
]

COLORS = ["red", "blue", "orange", "green"]
SHAPES = ["triangle", "diamond", "circle", "square"]


class Command(BaseCommand):
    help = "Create the Gerund and Infinitive quiz with 15 questions"

    def handle(self, *args, **options):
        creator = User.objects.filter(username="admin").first() or User.objects.first()
        quiz, created = Quiz.objects.get_or_create(
            title="Gerund and Infinitive",
            defaults={
                "description": "Practice choosing gerunds and infinitives in English.",
                "creator": creator,
                "is_public": True,
            },
        )

        if not created and quiz.questions.exists():
            self.stdout.write(self.style.WARNING(
                f"'{quiz.title}' already has {quiz.questions.count()} questions; nothing changed."
            ))
            return

        for order, (text, options, correct_index) in enumerate(QUESTIONS, start=1):
            question = Question.objects.create(
                quiz=quiz,
                question_text=text,
                time_limit=20,
                points=1000,
                order=order,
            )
            for option_order, option_text in enumerate(options):
                Option.objects.create(
                    question=question,
                    option_text=option_text,
                    is_correct=option_order == correct_index,
                    color=COLORS[option_order],
                    shape=SHAPES[option_order],
                    order=option_order,
                )

        self.stdout.write(self.style.SUCCESS(
            f"Created '{quiz.title}' with {len(QUESTIONS)} questions (ID: {quiz.id})."
        ))
