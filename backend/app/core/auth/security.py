import bcrypt
import random
import secrets
import string


def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))


def generate_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def generate_password():
    letras_maiusculas = string.ascii_uppercase
    letras_minusculas = string.ascii_lowercase
    numero = string.digits
    senha = [secrets.choice(letras_maiusculas), secrets.choice(letras_minusculas)]
    for _ in range(6):
        senha.append(secrets.choice(letras_maiusculas + letras_minusculas + numero))
    random.shuffle(senha)
    return "".join(senha)
