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
