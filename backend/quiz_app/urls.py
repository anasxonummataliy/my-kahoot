from django.urls import path
from . import views

urlpatterns = [
    path("quizzes/", views.quiz_list_create, name="quiz_list_create"),
    path("quizzes/<int:pk>/", views.quiz_detail, name="quiz_detail"),
    path("sessions/create/", views.session_create, name="session_create"),
    path("sessions/active/", views.active_sessions_list, name="active_sessions_list"),
    path("sessions/<str:pin>/", views.session_detail, name="session_detail"),
    path("sessions/<str:pin>/join/", views.session_join, name="session_join"),
    path("sessions/<str:pin>/answer/", views.session_answer, name="session_answer"),
    path("sessions/<str:pin>/stop/", views.session_stop, name="session_stop"),
    path("sessions/<str:pin>/player/avatar/", views.session_update_avatar, name="session_update_avatar"),
    path("sessions/<str:pin>/switch-quiz/", views.session_switch_quiz, name="session_switch_quiz"),
    path("sessions/<str:pin>/toggle-team-mode/", views.session_toggle_team_mode, name="session_toggle_team_mode"),
    path("sessions/<str:pin>/start-question/", views.session_start_question, name="session_start_question"),
    path("sessions/<str:pin>/end-question/", views.session_end_question, name="session_end_question"),
    path("sessions/<str:pin>/next-question/", views.session_next_question, name="session_next_question"),
    path("sessions/<str:pin>/show-leaderboard/", views.session_show_leaderboard, name="session_show_leaderboard"),
    path("sessions/<str:pin>/restart/", views.session_restart, name="session_restart"),
    path("auth/register/", views.auth_register, name="auth_register"),
    path("auth/login/", views.auth_login, name="auth_login"),
    path("auth/logout/", views.auth_logout, name="auth_logout"),
    path("auth/me/", views.auth_me, name="auth_me"),
]
