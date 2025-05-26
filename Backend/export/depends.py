from enum import Enum


def serialize_model(instance, depth=0):
    if instance is None:
        return None

    if isinstance(instance, list):
        return [serialize_model(item, depth) for item in instance]

    result = {}
    for column in instance.__table__.columns:
        value = getattr(instance, column.name)

        if isinstance(value, Enum):
            value = value.value

        result[column.name] = value

    if depth < 1:
        for relationship in instance.__mapper__.relationships:
            related = getattr(instance, relationship.key)
            if relationship.uselist:
                result[relationship.key] = [
                    serialize_model(item, depth + 1) for item in related
                ]
            else:
                result[relationship.key] = serialize_model(related, depth + 1)

    return result
