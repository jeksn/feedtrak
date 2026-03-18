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
            $table->string('avatar_url')->nullable()->after('icon_url');
            $table->string('banner_url')->nullable()->after('avatar_url');
            $table->bigInteger('subscriber_count')->nullable()->after('banner_url');
            $table->bigInteger('video_count')->nullable()->after('subscriber_count');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('feeds', function (Blueprint $table) {
            //
        });
    }
};
