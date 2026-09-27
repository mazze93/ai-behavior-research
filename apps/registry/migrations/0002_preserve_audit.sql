CREATE TRIGGER immutable_event BEFORE UPDATE ON events BEGIN SELECT RAISE(ABORT,'Events are append-only'); END;
CREATE TRIGGER retain_event BEFORE DELETE ON events BEGIN SELECT RAISE(ABORT,'Events are append-only'); END;
CREATE TRIGGER retain_run BEFORE DELETE ON runs BEGIN SELECT RAISE(ABORT,'Run records are retained'); END;
CREATE TRIGGER retain_annotation BEFORE DELETE ON annotations BEGIN SELECT RAISE(ABORT,'Annotations are retained'); END;
CREATE TRIGGER immutable_adjudication BEFORE UPDATE ON adjudications BEGIN SELECT RAISE(ABORT,'Adjudications are append-only'); END;
CREATE TRIGGER retain_adjudication BEFORE DELETE ON adjudications BEGIN SELECT RAISE(ABORT,'Adjudications are retained'); END;
CREATE TRIGGER immutable_assignment BEFORE UPDATE ON assignments BEGIN SELECT RAISE(ABORT,'Assignments are retained'); END;
CREATE TRIGGER retain_assignment BEFORE DELETE ON assignments BEGIN SELECT RAISE(ABORT,'Assignments are retained'); END;
