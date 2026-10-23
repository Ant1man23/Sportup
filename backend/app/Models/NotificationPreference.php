<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationPreference extends Model
{
    protected $primaryKey = ['user_id', 'type'];
    public $incrementing = false;

    protected $fillable = [
        'user_id',
        'type',
        'push_enabled',
    ];

    protected $casts = [
        'push_enabled' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
