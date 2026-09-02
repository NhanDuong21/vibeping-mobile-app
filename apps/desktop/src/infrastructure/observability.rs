use std::fmt::{Display, Formatter};

#[derive(Clone, Copy)]
pub struct SafeErrorCode(&'static str);

impl SafeErrorCode {
    pub fn from_error(code: &'static str, _error: &impl Display) -> Self {
        let valid = !code.is_empty()
            && code
                .bytes()
                .all(|value| value.is_ascii_uppercase() || value == b'_' || value.is_ascii_digit());
        Self(if valid { code } else { "UNKNOWN_FAILURE" })
    }
}

impl Display for SafeErrorCode {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(self.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn log_code_never_formats_the_source_error() {
        let source = "Bearer private-token owner@example.test C:\\private\\path";
        let rendered = SafeErrorCode::from_error("OUTBOX_WRITE_FAILED", &source).to_string();
        assert_eq!(rendered, "OUTBOX_WRITE_FAILED");
        assert!(!rendered.contains("private"));
        assert_eq!(
            SafeErrorCode::from_error("bad-code", &source).to_string(),
            "UNKNOWN_FAILURE"
        );
    }
}
