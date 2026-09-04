use std::time::{Duration, Instant};

const FOREGROUND_INTERVAL: Duration = Duration::from_secs(15);
const IDLE_INTERVAL: Duration = Duration::from_secs(60);
const MIN_READ_GAP: Duration = Duration::from_secs(5);

/// A single account reader serves every open screen and coalesces bursty triggers.
pub(super) struct RefreshSchedule {
    last_success: Instant,
    requested: bool,
}

impl RefreshSchedule {
    pub fn new(now: Instant) -> Self {
        Self {
            last_success: now,
            requested: false,
        }
    }

    pub fn request(&mut self) {
        self.requested = true;
    }

    pub fn is_recent(&self, now: Instant) -> bool {
        now.duration_since(self.last_success) < MIN_READ_GAP
    }

    pub fn is_due(&self, now: Instant, has_viewer: bool) -> bool {
        let interval = if self.requested {
            MIN_READ_GAP
        } else if has_viewer {
            FOREGROUND_INTERVAL
        } else {
            IDLE_INTERVAL
        };
        now.duration_since(self.last_success) >= interval
    }

    pub fn completed(&mut self, now: Instant) {
        self.last_success = now;
        self.requested = false;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn active_viewers_get_four_reads_per_minute_and_idle_gets_one() {
        for (has_viewer, expected) in [(true, vec![15, 30, 45, 60]), (false, vec![60])] {
            let start = Instant::now();
            let mut schedule = RefreshSchedule::new(start);
            let mut reads = Vec::new();
            for second in 1..=60 {
                let now = start + Duration::from_secs(second);
                if schedule.is_due(now, has_viewer) {
                    reads.push(second);
                    schedule.completed(now);
                }
            }
            assert_eq!(reads, expected);
        }
    }

    #[test]
    fn viewer_return_accelerates_a_read_and_last_viewer_leaving_slows_it() {
        let start = Instant::now();
        let mut schedule = RefreshSchedule::new(start);
        let returned = start + Duration::from_secs(25);
        assert!(!schedule.is_due(returned, false));
        assert!(schedule.is_due(returned, true));
        schedule.completed(returned);
        assert!(!schedule.is_due(returned + Duration::from_secs(15), false));
        assert!(schedule.is_due(returned + Duration::from_secs(60), false));
    }

    #[test]
    fn many_requests_share_recent_data_and_never_cause_a_read_storm() {
        let start = Instant::now();
        let mut schedule = RefreshSchedule::new(start);
        let mut reads = 0;
        for millisecond in 0..=10_000 {
            let now = start + Duration::from_millis(millisecond);
            schedule.request();
            if schedule.is_recent(now) {
                assert!(!schedule.is_due(now, true));
            } else if schedule.is_due(now, true) {
                reads += 1;
                schedule.completed(now);
            }
        }
        assert_eq!(reads, 2);
    }

    #[test]
    fn slow_reads_and_sleep_resume_do_not_replay_missed_poll_ticks() {
        let start = Instant::now();
        let mut schedule = RefreshSchedule::new(start);
        let resumed = start + Duration::from_secs(300);
        assert!(schedule.is_due(resumed, true));
        let finished = resumed + Duration::from_secs(8);
        schedule.completed(finished);
        for seconds in 0..15 {
            assert!(!schedule.is_due(finished + Duration::from_secs(seconds), true));
        }
        assert!(schedule.is_due(finished + Duration::from_secs(15), true));
    }
}
