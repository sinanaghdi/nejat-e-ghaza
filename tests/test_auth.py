def test_register_customer(client):
    response = client.post("/api/auth/register", json={"name":"Ali","email":"ali@example.com","password":"password123"})
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "ali@example.com"
    assert data["role"] == "CUSTOMER"

def test_duplicate_email(client):
    payload = {"name":"Ali","email":"ali@example.com","password":"password123"}
    assert client.post("/api/auth/register", json=payload).status_code == 201
    assert client.post("/api/auth/register", json=payload).status_code == 409

def test_login_returns_token(client):
    client.post("/api/auth/register", json={"name":"Ali","email":"ali@example.com","password":"password123"})
    response = client.post("/api/auth/login", json={"email":"ali@example.com","password":"password123"})
    assert response.status_code == 200
    assert response.json()["token_type"] == "bearer"
    assert response.json()["access_token"]


def test_login_sets_session_and_csrf_cookies(client):
    client.post(
        "/api/auth/register",
        json={"name": "Ali", "email": "cookie@example.com", "password": "password123"},
    )
    response = client.post(
        "/api/auth/login",
        json={"email": "cookie@example.com", "password": "password123"},
    )
    assert response.status_code == 200
    assert response.json()["csrf_token"]
    set_cookie = response.headers.get("set-cookie", "")
    assert "nejat_e_ghaza_session=" in set_cookie
    assert "HttpOnly" in set_cookie
    assert "nejat_e_ghaza_csrf=" in set_cookie

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == "cookie@example.com"


def test_cookie_authenticated_mutation_requires_csrf(client):
    client.post(
        "/api/auth/register",
        json={"name": "Ali", "email": "csrf@example.com", "password": "password123"},
    )
    client.post(
        "/api/auth/login",
        json={"email": "csrf@example.com", "password": "password123"},
    )
    response = client.post(
        "/api/payments/orders/999",
    )
    assert response.status_code == 403


def test_logout_clears_session(client):
    client.post(
        "/api/auth/register",
        json={"name": "Ali", "email": "logout@example.com", "password": "password123"},
    )
    client.post(
        "/api/auth/login",
        json={"email": "logout@example.com", "password": "password123"},
    )
    response = client.post(
        "/api/auth/logout",
        headers={"X-CSRF-Token": client.cookies.get("nejat_e_ghaza_csrf", "")},
    )
    assert response.status_code == 200
    assert client.get("/api/auth/me").status_code == 401
