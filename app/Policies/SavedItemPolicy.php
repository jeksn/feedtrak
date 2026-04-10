<?php

namespace App\Policies;

use App\Models\SavedItem;
use App\Models\User;

class SavedItemPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, SavedItem $savedItem): bool
    {
        return $savedItem->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, SavedItem $savedItem): bool
    {
        return $savedItem->user_id === $user->id;
    }

    public function delete(User $user, SavedItem $savedItem): bool
    {
        return $savedItem->user_id === $user->id;
    }

    public function restore(User $user, SavedItem $savedItem): bool
    {
        return $savedItem->user_id === $user->id;
    }

    public function forceDelete(User $user, SavedItem $savedItem): bool
    {
        return $savedItem->user_id === $user->id;
    }
}
