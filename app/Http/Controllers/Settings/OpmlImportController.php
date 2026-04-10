<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\OpmlImportRequest;
use App\Services\OpmlService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class OpmlImportController extends Controller
{
    public function show(): Response
    {
        return Inertia::render('settings/import');
    }

    public function import(OpmlImportRequest $request): RedirectResponse
    {

        $file = $request->file('opml_file');
        $content = file_get_contents($file->getRealPath());

        Log::info('Starting OPML import', ['user_id' => Auth::id(), 'content_length' => strlen($content)]);

        $opmlService = app(OpmlService::class);

        try {
            $parsed = $opmlService->parseOpml($content);
            Log::info('OPML parsed', ['feeds_count' => count($parsed['feeds']), 'categories_count' => count($parsed['categories'])]);

            $result = $opmlService->importOpml($content, Auth::id());

            $message = sprintf(
                'Imported %d feeds, skipped %d duplicates. Created %d categories.',
                $result['feeds_imported'],
                $result['feeds_skipped'],
                $result['categories_created']
            );

            if (! empty($result['errors'])) {
                $message .= ' Errors: '.implode('; ', array_slice($result['errors'], 0, 3));
            }

            return back()->with('success', $message);
        } catch (\Exception $e) {
            Log::error('OPML import failed', ['error' => $e->getMessage()]);

            return back()->withErrors(['file' => $e->getMessage()]);
        }
    }
}
