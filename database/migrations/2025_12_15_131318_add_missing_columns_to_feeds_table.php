<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('feeds', function (Blueprint $table) {
            $table->string('url')->unique()->after('id');
            $table->string('title')->after('url');
            $table->text('description')->nullable()->after('title');
            $table->string('feed_url')->unique()->after('description');
            $table->string('type')->default('rss')->after('feed_url');
            $table->string('icon_url')->nullable()->after('type');
            $table->timestamp('last_fetched_at')->nullable()->after('icon_url');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('feeds', function (Blueprint $table) {
            $table->dropColumn(['url', 'title', 'description', 'feed_url', 'type', 'icon_url', 'last_fetched_at']);
        });
    }
};
