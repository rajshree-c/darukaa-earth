def test_health_contract():
    # Database integration is covered by docker-compose in CI-ready deployments.
    from app.main import app
    assert app.title == "Darukaa.Earth API"
