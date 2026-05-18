from fastapi.testclient import TestClient

def test_login_missing_credentials(client: TestClient):
    # Try to login without credentials
    response = client.post("/api/v1/auth/login", data={})
    assert response.status_code == 422 # Validation error for missing form data

def test_login_invalid_credentials(client: TestClient):
    # Try to login with invalid credentials
    response = client.post("/api/v1/auth/login", data={"username": "invalid@test.com", "password": "wrongpassword"})
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]
