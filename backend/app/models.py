import json
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class FormTemplate(Base):
    __tablename__ = "form_templates"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    schema = Column(Text, nullable=False)
    created_by = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self) -> dict:
        try:
            parsed_schema = json.loads(self.schema)
        except json.JSONDecodeError:
            parsed_schema = self.schema
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "schema": parsed_schema,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class FormResponse(Base):
    __tablename__ = "form_responses"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("form_templates.id", ondelete="CASCADE"), nullable=False, index=True)
    username = Column(String(100), nullable=False, index=True)
    data = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self) -> dict:
        try:
            parsed_data = json.loads(self.data)
        except json.JSONDecodeError:
            parsed_data = self.data
        return {
            "id": self.id,
            "form_id": self.form_id,
            "username": self.username,
            "data": parsed_data,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
