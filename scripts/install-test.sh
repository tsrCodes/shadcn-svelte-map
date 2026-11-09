#!/usr/bin/env bash
# Install test: a fresh SvelteKit app gets `shadcn-svelte add` of every registry item
# (map, place-autocomplete and every block), then svelte-check and vite build.
#
# Usage: scripts/install-test.sh <2|3> [out-dir]
#   2|3      SvelteKit major (Kit 2 uses `$lib`, Kit 3 uses `#lib`)
#   out-dir  app folder, deleted first (default $TMPDIR/shadcn-svelte-map-install/kit<N>)
#
# Builds the registry JSON and serves `static/` on a local port while it runs.
set -euo pipefail

KIT="${1:?usage: scripts/install-test.sh <2|3> [out-dir]}"
OUT="${2:-${TMPDIR:-/tmp}/shadcn-svelte-map-install/kit$KIT}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# A free port per run, so parallel runs never collide; REGISTRY_PORT pins one for debugging
PORT="${REGISTRY_PORT:-$(python3 -c 'import socket; s = socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1]); s.close()')}"
REGISTRY="http://127.0.0.1:$PORT/r"
SHADCN="shadcn-svelte@1.7.2"

# shellcheck disable=SC2016 # `$lib` is the literal alias, not a variable
case "$KIT" in
	2) SV="sv@0.17.1" LIB='$lib' ;;
	3) SV="sv@1.1.1" LIB='#lib' ;;
	*) echo "Kit version must be 2 or 3" >&2; exit 1 ;;
esac

step() { printf '\n==> %s\n' "$1"; }

step "Building the registry"
(cd "$ROOT" && pnpm registry:build)

# Items in registry.json order: ui items first, then blocks
ITEMS=$(node -e 'for (const i of require(process.argv[1]).items) console.log(i.name)' "$ROOT/registry.json")
BLOCKS=$(node -e '
for (const i of require(process.argv[1]).items)
	if (i.type === "registry:block") console.log(i.name);
' "$ROOT/registry.json")

# shellcheck disable=SC2016 # the CLI's literal `$LIB$` placeholder
if grep -l '\$LIB\$/registry' "$ROOT"/static/r/*.json; then
	echo "Built items import app-only registry paths" >&2
	exit 1
fi

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT/static" > /dev/null 2>&1 &
SERVER=$!
ANSWER="$(mktemp)"
trap '{ kill "$SERVER" && wait "$SERVER"; } 2> /dev/null || true; rm -f "$ANSWER"' EXIT
for _ in $(seq 50); do
	curl -fsS "$REGISTRY/map.json" > /dev/null 2>&1 && break
	sleep 0.1
done
curl -fsS "$REGISTRY/map.json" > /dev/null || { echo "Registry not served at $REGISTRY" >&2; exit 1; }

step "Creating Kit $KIT app in $OUT"
rm -rf "$OUT"
mkdir -p "$(dirname "$OUT")"
pnpm dlx "$SV" create "$OUT" --template minimal --types ts \
	--add tailwindcss="plugins:none" --no-install
cd "$OUT"
# pnpm 11 needs a workspace file that names the app and allows esbuild's build
printf 'packages:\n  - .\n\nallowBuilds:\n  esbuild: true\n' > pnpm-workspace.yaml
pnpm install

# The CLI prompts even with flags (preset, CSS edits) and needs a TTY: `expect`
# runs it in one and accepts the default answer of every prompt (the default
# design system preset is Vega).
cat > "$ANSWER" <<'EXP'
set timeout 300
spawn {*}$argv
expect {
	-re {◆} { sleep 0.3; catch { send "\r" }; exp_continue }
	eof {}
	timeout { puts "\nTimed out waiting for shadcn-svelte"; exit 1 }
}
catch wait result
exit [lindex $result 3]
EXP
run_shadcn() { expect "$ANSWER" pnpm dlx "$SHADCN" "$@"; }

step "shadcn-svelte init"
run_shadcn init --base-color neutral --css src/routes/layout.css \
	--lib-alias "$LIB" --utils-alias "$LIB/utils" --components-alias "$LIB/components" \
	--ui-alias "$LIB/components/ui" --hooks-alias "$LIB/hooks" --no-deps-install

step "shadcn-svelte add $(echo "$ITEMS" | wc -l | tr -d ' ') items"
URLS=()
for i in $ITEMS; do URLS+=("$REGISTRY/$i.json"); done
run_shadcn add "${URLS[@]}" --overwrite --no-deps-install -y
pnpm install

step "Writing a page with every block"
{
	echo '<script lang="ts">'
	i=0
	for b in $BLOCKS; do
		echo "	import B$i from '$LIB/components/$b/$b.svelte';"
		i=$((i + 1))
	done
	echo "	const blocks = ["
	i=0
	for b in $BLOCKS; do
		echo "		{ name: '$b', component: B$i },"
		i=$((i + 1))
	done
	echo '	];'
	echo '</script>'
	echo
	echo '<main class="mx-auto grid max-w-5xl gap-8 p-8">'
	echo '	{#each blocks as { name, component: Block } (name)}'
	echo '		<section id={name}>'
	echo '			<h2 class="mb-2 font-medium">{name}</h2>'
	echo '			<Block class="h-[36rem]" />'
	echo '		</section>'
	echo '	{/each}'
	echo '</main>'
} > src/routes/+page.svelte

step "svelte-check"
pnpm exec svelte-kit sync
pnpm exec svelte-check --tsconfig ./tsconfig.json --fail-on-warnings

step "vite build"
pnpm exec vite build

step "Kit $KIT install test passed ($OUT)"
