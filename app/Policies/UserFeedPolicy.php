<?php

namespace App\Policies;

use App\Models\User;
use App\Models\UserFeed;

class UserFeedPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, UserFeed $userFeed): bool
    {
        return $userFeed->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, UserFeed $userFeed): bool
    {
        return $userFeed->user_id === $user->id;
    }

    public function delete(User $user, UserFeed $userFeed): bool
    {
        return $userFeed->user_id === $user->id;
    }

    public function restore(User $user, UserFeed $userFeed): bool
    {
        return $userFeed->user_id === $user->id;
    }

    public function forceDelete(User $user, UserFeed $userFeed): bool
    {
        return $userFeed->user_id === $user->id;
    }
}
