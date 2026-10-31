from django.core.management.base import BaseCommand
from quiz_app.models import Quiz, Question, Option


class Command(BaseCommand):
    help = "Seed database with default quizzes and questions"

    def handle(self, *args, **options):
        # 1. General Knowledge Challenge (From screenshot!)
        quiz1, created = Quiz.objects.get_or_create(
            title="General Knowledge Challenge",
            defaults={"description": "Answer as fast and correctly as you can!"},
        )
        if created or quiz1.questions.count() == 0:
            questions_data = [
                {
                    "text": "What is the capital of France?",
                    "time": 20,
                    "points": 1000,
                    "options": [
                        ("Berlin", False, "blue", "triangle"),
                        ("Paris", True, "red", "diamond"),
                        ("Rome", False, "orange", "circle"),
                        ("Madrid", False, "green", "square"),
                    ],
                },
                {
                    "text": "Which planet is known as the Red Planet?",
                    "time": 20,
                    "points": 1000,
                    "options": [
                        ("Venus", False, "blue", "triangle"),
                        ("Mars", True, "red", "diamond"),
                        ("Jupiter", False, "orange", "circle"),
                        ("Mercury", False, "green", "square"),
                    ],
                },
                {
                    "text": "What is the largest ocean on Earth?",
                    "time": 20,
                    "points": 1000,
                    "options": [
                        ("Atlantic Ocean", False, "blue", "triangle"),
                        ("Indian Ocean", False, "red", "diamond"),
                        ("Pacific Ocean", True, "orange", "circle"),
                        ("Arctic Ocean", False, "green", "square"),
                    ],
                },
                {
                    "text": "How many continents are there on Earth?",
                    "time": 20,
                    "points": 1000,
                    "options": [
                        ("5 Continents", False, "blue", "triangle"),
                        ("6 Continents", False, "red", "diamond"),
                        ("7 Continents", True, "orange", "circle"),
                        ("8 Continents", False, "green", "square"),
                    ],
                },
                {
                    "text": "Which element has the chemical symbol 'O'?",
                    "time": 20,
                    "points": 1000,
                    "options": [
                        ("Gold", False, "blue", "triangle"),
                        ("Oxygen", True, "red", "diamond"),
                        ("Osmium", False, "orange", "circle"),
                        ("Iron", False, "green", "square"),
                    ],
                },
                {
                    "text": "Who painted the Mona Lisa?",
                    "time": 20,
                    "points": 1000,
                    "options": [
                        ("Vincent van Gogh", False, "blue", "triangle"),
                        ("Leonardo da Vinci", True, "red", "diamond"),
                        ("Pablo Picasso", False, "orange", "circle"),
                        ("Claude Monet", False, "green", "square"),
                    ],
                },
                {
                    "text": "What is the fastest land animal in the world?",
                    "time": 20,
                    "points": 1000,
                    "options": [
                        ("Cheetah", True, "blue", "triangle"),
                        ("Lion", False, "red", "diamond"),
                        ("Pronghorn", False, "orange", "circle"),
                        ("Greyhound", False, "green", "square"),
                    ],
                },
                {
                    "text": "In computer science, what does 'CPU' stand for?",
                    "time": 20,
                    "points": 1000,
                    "options": [
                        ("Central Processing Unit", True, "blue", "triangle"),
                        ("Central Power Unit", False, "red", "diamond"),
                        ("Core Processing User", False, "orange", "circle"),
                        ("Command Process Utility", False, "green", "square"),
                    ],
                },
                {
                    "text": "Which country is famous for the Pyramids of Giza?",
                    "time": 20,
                    "points": 1000,
                    "options": [
                        ("Mexico", False, "blue", "triangle"),
                        ("Egypt", True, "red", "diamond"),
                        ("Greece", False, "orange", "circle"),
                        ("Peru", False, "green", "square"),
                    ],
                },
                {
                    "text": "What is the primary official language spoken in Brazil?",
                    "time": 20,
                    "points": 1000,
                    "options": [
                        ("Spanish", False, "blue", "triangle"),
                        ("Portuguese", True, "red", "diamond"),
                        ("French", False, "orange", "circle"),
                        ("English", False, "green", "square"),
                    ],
                },
            ]

            for idx, q in enumerate(questions_data, start=1):
                question = Question.objects.create(
                    quiz=quiz1,
                    question_text=q["text"],
                    time_limit=q["time"],
                    points=q["points"],
                    order=idx,
                )
                for opt_idx, (opt_text, is_corr, color, shape) in enumerate(q["options"]):
                    Option.objects.create(
                        question=question,
                        option_text=opt_text,
                        is_correct=is_corr,
                        color=color,
                        shape=shape,
                        order=opt_idx,
                    )
            self.stdout.write(self.style.SUCCESS(f"Seeded '{quiz1.title}' with 10 questions!"))

        # 2. Tech & Web Dev Quiz
        quiz2, created2 = Quiz.objects.get_or_create(
            title="Tech & Full-Stack Masters",
            defaults={"description": "Test your React, Python, and Web Development skills!"},
        )
        if created2 or quiz2.questions.count() == 0:
            tech_questions = [
                {
                    "text": "Which hook in React is used for managing component side-effects?",
                    "time": 20,
                    "points": 1000,
                    "options": [
                        ("useState", False, "blue", "triangle"),
                        ("useEffect", True, "red", "diamond"),
                        ("useContext", False, "orange", "circle"),
                        ("useMemo", False, "green", "square"),
                    ],
                },
                {
                    "text": "What does Django's ORM stand for?",
                    "time": 20,
                    "points": 1000,
                    "options": [
                        ("Object-Relational Mapping", True, "blue", "triangle"),
                        ("Optimal Routing Mechanism", False, "red", "diamond"),
                        ("Open Resource Manager", False, "orange", "circle"),
                        ("Online Record Module", False, "green", "square"),
                    ],
                },
                {
                    "text": "Which protocol provides full-duplex communication over a single TCP connection?",
                    "time": 20,
                    "points": 1000,
                    "options": [
                        ("HTTP/1.1", False, "blue", "triangle"),
                        ("WebSocket", True, "red", "diamond"),
                        ("FTP", False, "orange", "circle"),
                        ("SMTP", False, "green", "square"),
                    ],
                },
                {
                    "text": "Which CSS property is used to create smooth transition animations?",
                    "time": 20,
                    "points": 1000,
                    "options": [
                        ("transform", False, "blue", "triangle"),
                        ("transition", True, "red", "diamond"),
                        ("animation-duration", False, "orange", "circle"),
                        ("filter", False, "green", "square"),
                    ],
                },
                {
                    "text": "In JavaScript, which method converts a JSON string into a JS object?",
                    "time": 20,
                    "points": 1000,
                    "options": [
                        ("JSON.parse()", True, "blue", "triangle"),
                        ("JSON.stringify()", False, "red", "diamond"),
                        ("JSON.toObject()", False, "orange", "circle"),
                        ("JSON.convert()", False, "green", "square"),
                    ],
                },
            ]
            for idx, q in enumerate(tech_questions, start=1):
                question = Question.objects.create(
                    quiz=quiz2,
                    question_text=q["text"],
                    time_limit=q["time"],
                    points=q["points"],
                    order=idx,
                )
                for opt_idx, (opt_text, is_corr, color, shape) in enumerate(q["options"]):
                    Option.objects.create(
                        question=question,
                        option_text=opt_text,
                        is_correct=is_corr,
                        color=color,
                        shape=shape,
                        order=opt_idx,
                    )
            self.stdout.write(self.style.SUCCESS(f"Seeded '{quiz2.title}' with 5 questions!"))
