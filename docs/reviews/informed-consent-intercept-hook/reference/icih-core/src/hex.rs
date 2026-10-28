//! Strict lowercase hex. Wire fields have exactly one spelling, so decoding
//! rejects uppercase rather than normalising it.

/// Lowercase hex encoding.
pub fn encode(bytes: &[u8]) -> String {
    const DIGITS: &[u8; 16] = b"0123456789abcdef";
    let mut out = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        out.push(DIGITS[usize::from(byte >> 4)] as char);
        out.push(DIGITS[usize::from(byte & 0x0f)] as char);
    }
    out
}

/// Decode exactly `N` bytes from `2N` lowercase hex digits.
pub fn decode_array<const N: usize>(text: &str) -> Option<[u8; N]> {
    let raw = text.as_bytes();
    if raw.len() != N * 2 {
        return None;
    }
    // Length is exactly 2N (checked above), so the remainder is empty.
    let (pairs, _) = raw.as_chunks::<2>();
    let mut out = [0u8; N];
    for (slot, [high, low]) in out.iter_mut().zip(pairs) {
        *slot = (nibble(*high)? << 4) | nibble(*low)?;
    }
    Some(out)
}

fn nibble(digit: u8) -> Option<u8> {
    match digit {
        b'0'..=b'9' => Some(digit - b'0'),
        b'a'..=b'f' => Some(digit - b'a' + 10),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trips() {
        let bytes = [0x00, 0x7f, 0xab, 0xff];
        assert_eq!(decode_array::<4>(&encode(&bytes)), Some(bytes));
    }

    #[test]
    fn rejects_uppercase_odd_length_and_wrong_size() {
        assert_eq!(decode_array::<2>("ABCD"), None);
        assert_eq!(decode_array::<2>("abc"), None);
        assert_eq!(decode_array::<2>("abcdef"), None);
        assert_eq!(decode_array::<1>("g0"), None);
    }
}
