package com.sportup.mobile;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;

public class LocalNotificationModule extends ReactContextBaseJavaModule {

    private static final String CHANNEL_ID_DEFAULT = "sportup_default";
    private static final String CHANNEL_ID_SESSIONS = "sportup_sessions";
    private static final String CHANNEL_ID_CHAT     = "sportup_chat";
    private static final String CHANNEL_ID_TEAMS    = "sportup_teams";

    private static int notificationIdCounter = 1000;

    private final ReactApplicationContext reactContext;

    public LocalNotificationModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
        createNotificationChannels();
    }

    @Override
    public String getName() {
        return "LocalNotification";
    }

    // ─── Channel Setup ───────────────────────────────────────────────────────────

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager nm = (NotificationManager)
                reactContext.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        // Default
        nm.createNotificationChannel(buildChannel(
                CHANNEL_ID_DEFAULT, "SportUp — Général",
                "Notifications générales SportUp",
                NotificationManager.IMPORTANCE_DEFAULT, Color.parseColor("#00D4AA")));

        // Sessions
        nm.createNotificationChannel(buildChannel(
                CHANNEL_ID_SESSIONS, "SportUp — Sessions",
                "Notifications de sessions sportives",
                NotificationManager.IMPORTANCE_HIGH, Color.parseColor("#00D4AA")));

        // Chat
        nm.createNotificationChannel(buildChannel(
                CHANNEL_ID_CHAT, "SportUp — Messages",
                "Nouveaux messages du chat",
                NotificationManager.IMPORTANCE_HIGH, Color.parseColor("#6C63FF")));

        // Teams
        nm.createNotificationChannel(buildChannel(
                CHANNEL_ID_TEAMS, "SportUp — Équipes",
                "Notifications de vos équipes",
                NotificationManager.IMPORTANCE_DEFAULT, Color.parseColor("#FF6B35")));
    }

    private NotificationChannel buildChannel(String id, String name, String desc, int importance, int lightColor) {
        NotificationChannel channel = new NotificationChannel(id, name, importance);
        channel.setDescription(desc);
        channel.enableLights(true);
        channel.setLightColor(lightColor);
        channel.enableVibration(true);
        channel.setVibrationPattern(new long[]{0, 250, 100, 250});
        return channel;
    }

    // ─── React Methods ────────────────────────────────────────────────────────────

    /**
     * Show a local notification (called from JS).
     * @param options { title, body, type, notificationId }
     */
    @ReactMethod
    public void show(ReadableMap options) {
        String title = options.hasKey("title") ? options.getString("title") : "SportUp";
        String body  = options.hasKey("body")  ? options.getString("body")  : "";
        String type  = options.hasKey("type")  ? options.getString("type")  : "general";

        String channelId = resolveChannel(type);

        Context ctx = reactContext.getApplicationContext();

        // Tap intent — opens the app
        Intent openIntent = new Intent(ctx, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        openIntent.putExtra("notification_type", type);

        int piFlags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                ? PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                : PendingIntent.FLAG_UPDATE_CURRENT;

        PendingIntent pi = PendingIntent.getActivity(ctx, notificationIdCounter, openIntent, piFlags);

        // Small icon — uses the generic ic_notification if present, else default
        int smallIcon = getSmallIconRes(ctx);

        // Accent color
        int color = accentColorForType(type);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(ctx, channelId)
                .setSmallIcon(smallIcon)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setColor(color)
                .setAutoCancel(true)
                .setPriority(priorityForType(type))
                .setContentIntent(pi)
                .setVibrate(new long[]{0, 250, 100, 250});

        // Badge icon
        builder.setNumber(1);

        NotificationManager nm = (NotificationManager)
                ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.notify(notificationIdCounter++, builder.build());
        }
    }

    /**
     * Cancel all SportUp notifications.
     */
    @ReactMethod
    public void cancelAll() {
        NotificationManager nm = (NotificationManager)
                reactContext.getApplicationContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.cancelAll();
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────────

    private String resolveChannel(String type) {
        if (type == null) return CHANNEL_ID_DEFAULT;
        switch (type) {
            case "session_joined":
            case "session_left":
            case "session_full":
            case "session_started":
                return CHANNEL_ID_SESSIONS;
            case "new_message":
                return CHANNEL_ID_CHAT;
            case "team_invite":
            case "team_update":
                return CHANNEL_ID_TEAMS;
            default:
                return CHANNEL_ID_DEFAULT;
        }
    }

    private int priorityForType(String type) {
        if ("new_message".equals(type) || "session_started".equals(type)) {
            return NotificationCompat.PRIORITY_HIGH;
        }
        return NotificationCompat.PRIORITY_DEFAULT;
    }

    private int accentColorForType(String type) {
        if (type == null) return Color.parseColor("#00D4AA");
        switch (type) {
            case "new_message": return Color.parseColor("#6C63FF");
            case "team_invite":
            case "team_update": return Color.parseColor("#FF6B35");
            default:            return Color.parseColor("#00D4AA");
        }
    }

    private int getSmallIconRes(Context ctx) {
        // Try to use a custom notification icon first
        int resId = ctx.getResources().getIdentifier("ic_notification", "drawable", ctx.getPackageName());
        if (resId != 0) return resId;
        // Fallback to the launcher icon (always present)
        resId = ctx.getResources().getIdentifier("ic_launcher", "mipmap", ctx.getPackageName());
        if (resId != 0) return resId;
        return android.R.drawable.ic_dialog_info;
    }
}
