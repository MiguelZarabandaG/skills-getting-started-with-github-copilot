import os
import sys
import copy
import pytest

# Ensure src is importable
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))

from app import app, activities
from fastapi.testclient import TestClient

client = TestClient(app)

# Snapshot original activities to restore between tests
_orig_activities = copy.deepcopy(activities)

@pytest.fixture(autouse=True)
def reset_activities():
    # restore activities before each test
    activities.clear()
    activities.update(copy.deepcopy(_orig_activities))
    yield
    # restore after test as well
    activities.clear()
    activities.update(copy.deepcopy(_orig_activities))


def test_get_activities():
    resp = client.get('/activities')
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert 'Chess Club' in data


def test_signup_and_duplicate():
    email = 'test.student@example.com'
    activity_name = 'Chess Club'

    # Ensure not present initially
    resp = client.get('/activities')
    assert email not in resp.json()[activity_name]['participants']

    # Signup should succeed
    resp = client.post(f"/activities/{activity_name}/signup?email={email}")
    assert resp.status_code == 200
    body = resp.json()
    assert 'message' in body
    # server returns updated activity
    assert 'activity' in body
    assert email in body['activity']['participants']

    # Duplicate signup should fail with 400
    resp = client.post(f"/activities/{activity_name}/signup?email={email}")
    assert resp.status_code == 400
    assert resp.json().get('detail')


def test_delete_participant():
    email = 'to.remove@example.com'
    activity_name = 'Programming Class'

    # Add participant first
    resp = client.post(f"/activities/{activity_name}/signup?email={email}")
    assert resp.status_code == 200
    assert email in resp.json()['activity']['participants']

    # Remove participant
    resp = client.delete(f"/activities/{activity_name}/participants?email={email}")
    assert resp.status_code == 200
    body = resp.json()
    assert 'message' in body
    assert email not in body['activity']['participants']

    # Removing again should fail
    resp = client.delete(f"/activities/{activity_name}/participants?email={email}")
    assert resp.status_code == 400


def test_signup_nonexistent_activity():
    resp = client.post('/activities/NoSuchActivity/signup?email=abc@example.com')
    assert resp.status_code == 404
