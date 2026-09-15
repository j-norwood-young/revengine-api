#!/usr/bin/env bash
# Force-disable TOTP / 2FA for a user (admin recovery when SHARED_SECRET
# changed or authenticator is lost). Does not require a valid TOTP code.
#
# Usage (from revengine-api):
#   pnpm disable-totp -- user@example.com
#   ./scripts/disable-totp.sh user@example.com
#
set -euo pipefail

cd "$(dirname "$0")/.."

# pnpm/npm may forward a literal "--" before the email
email=""
for arg in "$@"; do
	[[ "$arg" == "--" ]] && continue
	email="$arg"
	break
done

if [[ -z "$email" ]]; then
	echo "Usage: pnpm disable-totp -- <email>" >&2
	exit 1
fi

# Basic sanity — avoid breaking the mongosh eval string
if [[ "$email" == *$'\n'* || "$email" == *"'"* || "$email" == *'"'* || "$email" == *'\\'* ]]; then
	echo "Invalid email characters" >&2
	exit 1
fi

email_lc=$(printf '%s' "$email" | tr '[:upper:]' '[:lower:]')

./mongosh --quiet --eval "
const email = '${email_lc}';
const before = db.users.findOne(
  { email },
  { email: 1, totp_enabled: 1, totp_secret_enc: 1, totp_pending_secret_enc: 1, totp_backup_hashes: 1 }
);
if (!before) {
  print(JSON.stringify({ ok: false, error: 'user not found', email }));
  quit(1);
}
const r = db.users.updateOne(
  { email },
  {
    \$set: { totp_enabled: false },
    \$unset: {
      totp_secret_enc: '',
      totp_pending_secret_enc: '',
      totp_backup_hashes: ''
    }
  }
);
print(JSON.stringify({
  ok: true,
  email,
  matched: r.matchedCount,
  modified: r.modifiedCount,
  was_enabled: Boolean(before.totp_enabled),
  had_secret: Boolean(before.totp_secret_enc)
}));
"
