use std::sync::OnceLock;

use regex::Regex;

pub fn redact_sensitive_text(input: &str) -> String {
    let patterns = patterns();
    let redacted = patterns.email.replace_all(input, "[email removed]");
    let redacted = patterns
        .bearer
        .replace_all(&redacted, "Bearer [token removed]");
    patterns
        .secret_key
        .replace_all(&redacted, "[token removed]")
        .into_owned()
}

struct Patterns {
    email: Regex,
    bearer: Regex,
    secret_key: Regex,
}

fn patterns() -> &'static Patterns {
    static PATTERNS: OnceLock<Patterns> = OnceLock::new();
    PATTERNS.get_or_init(|| Patterns {
        email: Regex::new(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}").unwrap(),
        bearer: Regex::new(r"(?i)bearer\s+[A-Za-z0-9._-]{8,}").unwrap(),
        secret_key: Regex::new(r"sk-(?:proj-)?[A-Za-z0-9_-]{8,}").unwrap(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn email_and_tokens_are_redacted() {
        let text = "user@example.com Bearer abcdefghijkl sk-proj-secretvalue";
        let result = redact_sensitive_text(text);
        assert!(!result.contains("user@example.com"));
        assert!(!result.contains("abcdefghijkl"));
        assert!(!result.contains("secretvalue"));
    }
}
