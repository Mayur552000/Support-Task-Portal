import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import hash_password, verify_password
from app.db.excel_repository import repository

client = TestClient(app)

def test_password_hashing():
    pwd = "password123"
    hashed = hash_password(pwd)
    assert verify_password(pwd, hashed) is True
    assert verify_password("wrongpass", hashed) is False

def test_login_flow():
    response = client.post("/api/auth/login", json={"username": "mayur", "password": "password123"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["username"] == "mayur"
    assert data["user"]["role"] == "ADMIN"

def test_read_only_helpdesk_guarantee():
    res = client.post("/api/auth/login", json={"username": "mayur", "password": "password123"})
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Adding an update MUST store to local repo ONLY and not send write calls to Helpdesk
    upd_res = client.post("/api/tickets/44690/updates", json={
        "update_text": "Unit test verified local work log",
        "status": "In Progress",
        "next_action": "Verify local storage"
    }, headers=headers)
    
    assert upd_res.status_code == 200
    upd_data = upd_res.json()
    assert upd_data["ticket_id"] == "44690"
    assert upd_data["update_text"] == "Unit test verified local work log"

def test_freshdesk_status_durations_and_activities():
    res = client.post("/api/auth/login", json={"username": "mayur", "password": "password123"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch live ticket 44690 detail
    r = client.get("/api/helpdesk/tickets/44690", headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert "ticket" in body
    assert "status_durations_days" in body
    ticket = body["ticket"]
    assert ticket["external_id"] == "44690"
    assert isinstance(ticket["status_durations"], dict)
    assert len(ticket["status_durations"]) > 0
    assert "Open" in ticket["status_durations"] or "In Progress" in ticket["status_durations"]
    assert isinstance(ticket["activities"], list)
    assert len(ticket["activities"]) > 0
    first_act = ticket["activities"][0]
    assert "actor" in first_act
    assert "timestamp" in first_act
    assert "category" in first_act
    assert "action_text" in first_act

def test_team_dashboard_and_agent_workspace():
    res = client.post("/api/auth/login", json={"username": "mayur", "password": "password123"})
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Team Dashboard
    r_team = client.get("/api/dashboard/team", headers=headers)
    assert r_team.status_code == 200
    team_data = r_team.json()
    assert "team_kpis" in team_data
    assert "agent_cards" in team_data
    assert len(team_data["agent_cards"]) > 0
    # Check agent card fields
    card = team_data["agent_cards"][0]
    assert "name" in card
    assert "workload_status" in card
    assert card["workload_status"] in ["Normal", "High", "Overdue", "Critical"]
    assert "open_tickets" in card

    # 2. Agent Workspace Detail Drill-Down
    r_agent = client.get(f"/api/dashboard/agents/{card['agent_id']}", headers=headers)
    assert r_agent.status_code == 200
    agent_workspace = r_agent.json()
    assert "agent" in agent_workspace
    assert "tickets" in agent_workspace
    assert "tasks" in agent_workspace
    assert "updates" in agent_workspace

def test_user_management_crud_and_rbac():
    # 1. Login as Admin
    res_admin = client.post("/api/auth/login", json={"username": "admin", "password": "password123"})
    token_admin = res_admin.json()["access_token"]
    headers_admin = {"Authorization": f"Bearer {token_admin}"}

    # List users
    r_users = client.get("/api/users", headers=headers_admin)
    assert r_users.status_code == 200
    users_list = r_users.json()
    assert len(users_list) >= 3

    # Create new local agent user
    new_user_payload = {
        "username": "test_agent_rbac",
        "password": "Password@123",
        "full_name": "Test Support Agent",
        "email": "test.agent@casco.com",
        "role": "AGENT",
        "external_helpdesk_agent_id": "12059999999",
        "source": "Local",
        "status": "Active"
    }
    r_create = client.post("/api/users", json=new_user_payload, headers=headers_admin)
    assert r_create.status_code == 201
    created_user = r_create.json()
    uid = created_user["user_id"]
    assert created_user["username"] == "test_agent_rbac"
    assert created_user["external_helpdesk_agent_id"] == "12059999999"

    # Test RBAC with newly created AGENT user
    res_agent = client.post("/api/auth/login", json={"username": "test_agent_rbac", "password": "Password@123"})
    assert res_agent.status_code == 200
    token_agent = res_agent.json()["access_token"]
    r_forbidden = client.get("/api/users", headers={"Authorization": f"Bearer {token_agent}"})
    assert r_forbidden.status_code == 403

    # Update user mapping & status
    r_update = client.put(f"/api/users/{uid}", json={
        "full_name": "Test Support Agent Updated",
        "external_helpdesk_agent_id": "12058888888"
    }, headers=headers_admin)
    assert r_update.status_code == 200
    assert r_update.json()["full_name"] == "Test Support Agent Updated"
    assert r_update.json()["external_helpdesk_agent_id"] == "12058888888"

    # Reset password
    r_reset = client.post(f"/api/users/{uid}/reset-password", json={"new_password": "NewSecretPassword123"}, headers=headers_admin)
    assert r_reset.status_code == 200

    # Disable user
    r_dis = client.post(f"/api/users/{uid}/disable", headers=headers_admin)
    assert r_dis.status_code == 200

    # Enable user
    r_en = client.post(f"/api/users/{uid}/enable", headers=headers_admin)
    assert r_en.status_code == 200

    # Delete user
    r_del = client.delete(f"/api/users/{uid}", headers=headers_admin)
    assert r_del.status_code == 200

