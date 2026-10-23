<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Auth\ForgotPasswordAction;
use App\Actions\Auth\LoginUserAction;
use App\Actions\Auth\RegisterUserAction;
use App\Actions\Auth\ResetPasswordAction;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function register(Request $request, RegisterUserAction $action): JsonResponse
    {
        $validated = $request->validate([
            'username' => 'required|string|max:50|unique:users,username',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'city' => 'nullable|string|max:100',
        ]);

        $result = $action->execute($validated);

        return response()->json($result, 201);
    }

    public function login(Request $request, LoginUserAction $action): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $result = $action->execute($validated);

        return response()->json($result, 200);
    }

    public function forgotPassword(Request $request, ForgotPasswordAction $action): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
        ]);

        $result = $action->execute($validated);

        return response()->json($result, 200);
    }

    public function resetPassword(Request $request, ResetPasswordAction $action): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'code' => 'required|string|min:4|max:10',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $result = $action->execute($validated);

        return response()->json($result, 200);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(null, 204);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user()->load('favoriteSports'), 200);
    }
}
