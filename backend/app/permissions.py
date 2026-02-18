from sqlalchemy.orm import Session

from app.models import Rule, User, UserRole, UserRule

ROUTE_MANAGE = "routes.manage"
BOOKING_MANAGE = "bookings.manage"
USERS_MANAGE = "users.manage"
RULES_MANAGE = "rules.manage"
TARIFFS_MANAGE = "tariffs.manage"
REVIEWS_MODERATE = "reviews.moderate"


def user_has_rule(db: Session, user: User, code: str) -> bool:
    if user.role == UserRole.superuser:
        return True
    return (
        db.query(Rule)
        .join(UserRule, Rule.id == UserRule.rule_id)
        .filter(UserRule.user_id == user.id, Rule.code == code)
        .first()
        is not None
    )


def role_rule_ids(db: Session, role: UserRole) -> set[int]:
    if role == UserRole.superuser:
        return {rule_id for (rule_id,) in db.query(Rule.id).all()}
    roles = {role}
    if role == UserRole.admin:
        roles.add(UserRole.manager)
    return {
        rule_id
        for (rule_id,) in db.query(Rule.id).filter(Rule.associated_role.in_(roles)).all()
    }


def sync_user_rules(db: Session, user: User) -> None:
    role_ids = role_rule_ids(db, user.role)
    custom_ids = {
        rule_id
        for (rule_id,) in (
            db.query(UserRule.rule_id)
            .join(Rule, Rule.id == UserRule.rule_id)
            .filter(UserRule.user_id == user.id, Rule.associated_role.is_(None))
            .all()
        )
    }
    desired_ids = role_ids | custom_ids
    existing_ids = {
        rule_id
        for (rule_id,) in db.query(UserRule.rule_id).filter(UserRule.user_id == user.id).all()
    }
    extra_ids = existing_ids - desired_ids
    if extra_ids:
        db.query(UserRule).filter(
            UserRule.user_id == user.id,
            UserRule.rule_id.in_(extra_ids),
        ).delete(synchronize_session=False)
    for rule_id in desired_ids - existing_ids:
        db.add(UserRule(user_id=user.id, rule_id=rule_id))


def assign_rule_to_role_users(db: Session, rule: Rule) -> None:
    if not rule.associated_role:
        return
    target_roles = {rule.associated_role}
    if rule.associated_role == UserRole.manager:
        target_roles.add(UserRole.admin)
    user_ids = [
        user_id for (user_id,) in db.query(User.id).filter(User.role.in_(target_roles)).all()
    ]
    if not user_ids:
        return
    existing = {
        user_id
        for (user_id,) in db.query(UserRule.user_id)
        .filter(UserRule.rule_id == rule.id, UserRule.user_id.in_(user_ids))
        .all()
    }
    for user_id in user_ids:
        if user_id not in existing:
            db.add(UserRule(user_id=user_id, rule_id=rule.id))


def remove_rule_from_role_users(db: Session, rule: Rule, role: UserRole) -> None:
    target_roles = {role}
    if role == UserRole.manager:
        target_roles.add(UserRole.admin)
    db.query(UserRule).join(User, User.id == UserRule.user_id).filter(
        User.role.in_(target_roles),
        UserRule.rule_id == rule.id,
    ).delete(synchronize_session=False)
