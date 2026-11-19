"""Authentication, portal separation and RBAC regression coverage."""

from __future__ import annotations

from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from backend.app.config import settings
from backend.app.main import app
from backend.app.services.seed_service import seed_database


@pytest.fixture(scope="module", autouse=True)
def seeded_database():
    seed_database()


def login(client: TestClient, username: str, password: str, portal: str):
    return client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": password, "portal": portal},
    )


def test_unauthenticated_control_surface_is_rejected():
    with TestClient(app) as client:
        assert client.get("/api/v1/pumps/").status_code == 401
        assert client.get("/api/v1/incidents/").status_code == 401


def test_civic_portal_is_isolated_from_operations():
    with TestClient(app) as client:
        response = login(client, "civic", settings.DEMO_CIVIC_PASSWORD, "civic")
        assert response.status_code == 200
        assert response.json()["user"]["role"] == "civic"
        assert client.get("/api/v1/map/layers").status_code == 200
        assert client.get("/api/v1/incidents/").status_code == 403
        assert client.get("/api/v1/pumps/").status_code == 403


def test_portal_mismatch_is_rejected():
    with TestClient(app) as client:
        response = login(client, "operator", settings.DEMO_OPERATOR_PASSWORD, "admin")
        assert response.status_code == 403


def test_analyst_is_read_only_and_operator_can_reach_control_console():
    with TestClient(app) as analyst_client:
        assert login(analyst_client, "analyst", settings.DEMO_ANALYST_PASSWORD, "operations").status_code == 200
        assert analyst_client.get("/api/v1/incidents/").status_code == 200
        assert analyst_client.get("/api/v1/devices/edge-nodes").status_code == 200
        assert analyst_client.get("/api/v1/pumps/").status_code == 403

    with TestClient(app) as operator_client:
        assert login(operator_client, "operator", settings.DEMO_OPERATOR_PASSWORD, "operations").status_code == 200
        assert operator_client.get("/api/v1/pumps/").status_code == 200


def test_civic_registration_creates_session_and_admin_manages_accounts():
    civic_username = f"civic_{uuid4().hex[:8]}"
    managed_username = f"analyst_{uuid4().hex[:8]}"
    with TestClient(app) as civic_client:
        created = civic_client.post(
            "/api/v1/auth/register/civic",
            json={"username": civic_username, "password": "CivicStrong#2026"},
        )
        assert created.status_code == 201
        assert login(civic_client, civic_username, "CivicStrong#2026", "civic").status_code == 200
        assert civic_client.get("/api/v1/auth/me").json()["username"] == civic_username
        assert civic_client.post("/api/v1/auth/logout").status_code == 204
        assert civic_client.get("/api/v1/auth/me").status_code == 401

    with TestClient(app) as admin_client:
        assert login(admin_client, "admin", settings.DEMO_ADMIN_PASSWORD, "admin").status_code == 200
        created = admin_client.post(
            "/api/v1/auth/users",
            json={"username": managed_username, "password": "AnalystStrong#2026", "role": "analyst"},
        )
        assert created.status_code == 201
        user = created.json()
        disabled = admin_client.patch(f"/api/v1/auth/users/{user['id']}/status", json={"is_active": False})
        assert disabled.status_code == 200
        assert disabled.json()["is_active"] is False
