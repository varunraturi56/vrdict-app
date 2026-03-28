/**
 * Import VRdict backup JSON into Supabase.
 *
 * Usage:
 *   1. Run the supabase-schema.sql in the Supabase SQL Editor first
 *   2. Sign up in the app (http://localhost:3000/login) to create your user
 *   3. Get your user ID from Supabase dashboard: Authentication → Users → copy UUID
 *   4. Run: npx tsx scripts/import-backup.ts <user-id>
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const SUPABASE_URL = "https://lzjergjdbiwnutahkggc.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error(
    "\n❌ Missing SUPABASE_SERVICE_KEY environment variable.\n" +
      "   Get it from: Supabase Dashboard → Settings → API → service_role (secret)\n" +
      "   Run as: SUPABASE_SERVICE_KEY=your_key npx tsx scripts/import-backup.ts <user-id>\n"
  );
  process.exit(1);
}

const userId = process.argv[2];
if (!userId) {
  console.error(
    "\n❌ Missing user ID argument.\n" +
      "   Get it from: Supabase Dashboard → Authentication → Users → copy UUID\n" +
      "   Usage: SUPABASE_SERVICE_KEY=... npx tsx scripts/import-backup.ts <user-id>\n"
  );
  process.exit(1);
}

// Use service role key to bypass RLS
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const backupPath = resolve(
  __dirname,
  "../../movie-logger/vrdict-backup-2026-03-27.json"
);

interface BackupEntry {
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  year: string;
  genres: string[];
  poster: string;
  overview: string;
  tmdbRating: number;
  runtime: number;
  seasons: number;
  episodes: number;
  imdbId: string;
  myRating: number;
  tags: string[];
  recommended: boolean;
  rewatch?: boolean;
  yearWatched: string;
  addedAt: string;
}

interface BackupBucket {
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  year: string;
  genres: string[];
  poster: string;
  overview: string;
  tmdbRating: number;
  runtime: number;
  seasons: number;
  episodes: number;
  imdbId: string;
  addedAt: string;
}

interface Backup {
  vrdict_backup: boolean;
  entries: BackupEntry[];
  bucket: BackupBucket[];
  customTags: string[];
}

async function main() {
  console.log("📦 Reading backup file...");
  const raw = readFileSync(backupPath, "utf-8");
  const backup: Backup = JSON.parse(raw);

  if (!backup.vrdict_backup) {
    console.error("❌ Not a valid VRdict backup file");
    process.exit(1);
  }

  console.log(
    `   Found ${backup.entries.length} entries, ${backup.bucket.length} watchlist items, ${backup.customTags.length} custom tags\n`
  );

  // 1. Import entries (in batches of 50)
  console.log("🎬 Importing entries...");
  const entryRows = backup.entries.map((e) => ({
    user_id: userId,
    tmdb_id: e.tmdb_id,
    media_type: e.media_type,
    title: e.title,
    year: e.year || null,
    genres: e.genres || [],
    poster: e.poster || null,
    overview: e.overview || null,
    tmdb_rating: e.tmdbRating || null,
    runtime: e.runtime || 0,
    seasons: e.seasons || 0,
    episodes: e.episodes || 0,
    imdb_id: e.imdbId || null,
    my_rating: e.myRating,
    tags: e.tags || [],
    recommended: e.recommended || false,
    rewatch: e.rewatch || false,
    year_watched: e.yearWatched || null,
    added_at: e.addedAt,
  }));

  let entryCount = 0;
  for (let i = 0; i < entryRows.length; i += 50) {
    const batch = entryRows.slice(i, i + 50);
    const { error } = await supabase.from("entries").upsert(batch, {
      onConflict: "user_id,tmdb_id,media_type",
    });
    if (error) {
      console.error(`   ❌ Batch ${i}-${i + batch.length}: ${error.message}`);
    } else {
      entryCount += batch.length;
      process.stdout.write(`   ✓ ${entryCount}/${entryRows.length}\r`);
    }
  }
  console.log(`   ✅ ${entryCount} entries imported`);

  // 2. Import watchlist
  console.log("📋 Importing watchlist...");
  const watchlistRows = backup.bucket.map((b) => ({
    user_id: userId,
    tmdb_id: b.tmdb_id,
    media_type: b.media_type,
    title: b.title,
    year: b.year || null,
    genres: b.genres || [],
    poster: b.poster || null,
    overview: b.overview || null,
    tmdb_rating: b.tmdbRating || null,
    runtime: b.runtime || 0,
    seasons: b.seasons || 0,
    episodes: b.episodes || 0,
    imdb_id: b.imdbId || null,
    added_at: b.addedAt,
  }));

  let watchlistCount = 0;
  for (let i = 0; i < watchlistRows.length; i += 50) {
    const batch = watchlistRows.slice(i, i + 50);
    const { error } = await supabase.from("watchlist").upsert(batch, {
      onConflict: "user_id,tmdb_id,media_type",
    });
    if (error) {
      console.error(`   ❌ Batch ${i}-${i + batch.length}: ${error.message}`);
    } else {
      watchlistCount += batch.length;
      process.stdout.write(`   ✓ ${watchlistCount}/${watchlistRows.length}\r`);
    }
  }
  console.log(`   ✅ ${watchlistCount} watchlist items imported`);

  // 3. Import custom tags
  console.log("🏷️  Importing custom tags...");
  if (backup.customTags.length > 0) {
    const tagRows = backup.customTags.map((name) => ({
      user_id: userId,
      name,
    }));
    const { error } = await supabase.from("custom_tags").upsert(tagRows, {
      onConflict: "user_id,name",
    });
    if (error) {
      console.error(`   ❌ ${error.message}`);
    } else {
      console.log(`   ✅ ${tagRows.length} custom tags imported`);
    }
  }

  console.log("\n🎉 Import complete!");
  console.log(
    `   ${entryCount} entries (${entryRows.filter((e) => e.media_type === "movie").length} movies, ${entryRows.filter((e) => e.media_type === "tv").length} TV)`
  );
  console.log(`   ${watchlistCount} watchlist items`);
  console.log(`   ${backup.customTags.length} custom tags`);
}

main().catch(console.error);
