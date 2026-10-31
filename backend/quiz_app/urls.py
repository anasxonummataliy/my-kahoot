from django.urls import path
from . import views

urlpatterns = [
    path("quizzes/", views.quiz_list_create, name="quiz_list_create"),
    path("quizzes/<int:pk>/", views.quiz_detail, name="quiz_detail"),
    path("sessions/create/", views.session_create, name="session_create"),
    path("sessions/<str:pin>/", views.session_detail, name="session_detail"),
    path("sessions/<str:pin>/join/", views.session_join, name="session_join"),
    path("sessions/<str:pin>/answer/", views.session_answer, name="session_answer"),
]
