from app.core.security import hash_password
from app.models.admin_user import AdminUser


def create_admin(db) -> None:
    db.add(
        AdminUser(
            email="admin@example.com",
            password_hash=hash_password("correct-password"),
            role="admin",
            active=True,
        )
    )
    db.commit()


def test_cookie_session_requires_csrf_for_admin_mutations(client, db):
    create_admin(db)
    login = client.post(
        "/admin/auth/login",
        json={"email": "admin@example.com", "password": "correct-password"},
    )
    assert login.status_code == 200
    assert "flamingo_bean_admin_session" in login.cookies
    assert "access_token" not in login.json()
    assert client.get("/admin/products").status_code == 200

    product = {
        "name": "Admin Product",
        "description": "Created by an administrator.",
        "category": "Coffee",
        "price": 10,
        "size": "12 oz",
        "image_url": "",
        "roast_level": "",
        "origin": "",
        "active": True,
    }
    assert client.post("/admin/products", json=product).status_code == 403
    assert (
        client.post(
            "/admin/products",
            json=product,
            headers={"X-CSRF-Token": login.json()["csrf_token"]},
        ).status_code
        == 201
    )


def test_admin_login_rate_limit_activates(client, monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_ADMIN_LOGIN", "2/60")
    payload = {"email": "nobody@example.com", "password": "wrong-password"}
    assert client.post("/admin/auth/login", json=payload).status_code == 401
    assert client.post("/admin/auth/login", json=payload).status_code == 401
    response = client.post("/admin/auth/login", json=payload)
    assert response.status_code == 429
    assert response.headers["Retry-After"]
