<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Feuille de Match Officielle - {{ $teamAName }} vs {{ $teamBName }} | SportUp</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #F8FAFC;
            color: #0F172A;
            line-height: 1.4;
            padding: 24px;
        }
        .page {
            max-width: 900px;
            margin: 0 auto;
            background: #FFFFFF;
            padding: 32px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            border: 1px solid #E2E8F0;
        }
        .toolbar {
            max-width: 900px;
            margin: 0 auto 16px auto;
            display: flex;
            justifyContent: space-between;
            align-items: center;
        }
        .btn-print {
            background-color: #1456D9;
            color: #FFFFFF;
            padding: 10px 20px;
            border-radius: 6px;
            border: none;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        .btn-print:hover {
            background-color: #0E42A8;
        }
        .header-section {
            border-bottom: 2px solid #0F172A;
            padding-bottom: 16px;
            margin-bottom: 20px;
            display: flex;
            justifyContent: space-between;
            align-items: flex-start;
        }
        .header-left h1 {
            font-size: 20px;
            font-weight: 900;
            letter-spacing: 0.5px;
            color: #0F172A;
            text-transform: uppercase;
        }
        .header-left p {
            font-size: 12px;
            color: #64748B;
            font-weight: 600;
            margin-top: 2px;
        }
        .header-right {
            text-align: right;
        }
        .badge-status {
            background-color: #DCFCE7;
            color: #16A34A;
            font-size: 11px;
            font-weight: 800;
            padding: 4px 10px;
            border-radius: 20px;
            display: inline-block;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .match-meta-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            background: #F1F5F9;
            padding: 12px 16px;
            border-radius: 6px;
            margin-bottom: 20px;
            font-size: 12px;
        }
        .meta-item strong {
            display: block;
            color: #64748B;
            font-size: 10px;
            text-transform: uppercase;
            margin-bottom: 2px;
        }
        .meta-item span {
            font-weight: 700;
            color: #0F172A;
        }
        .score-banner {
            border: 2px solid #E2E8F0;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 24px;
            display: flex;
            align-items: center;
            justify-content: space-around;
            background: #FAFAFA;
        }
        .team-box {
            text-align: center;
            flex: 1;
        }
        .team-box .name {
            font-size: 18px;
            font-weight: 800;
            color: #0F172A;
        }
        .team-box .color-pill {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 6px;
            margin-right: 4px;
            vertical-align: middle;
        }
        .score-box {
            text-align: center;
            padding: 0 24px;
        }
        .score-box .main-score {
            font-size: 42px;
            font-weight: 900;
            color: #0F172A;
            line-height: 1;
        }
        .score-box .score-label {
            font-size: 10px;
            font-weight: 800;
            color: #64748B;
            letter-spacing: 1px;
            margin-top: 4px;
        }
        .periods-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
            font-size: 12px;
        }
        .periods-table th, .periods-table td {
            border: 1px solid #CBD5E1;
            padding: 8px 12px;
            text-align: center;
        }
        .periods-table th {
            background: #F1F5F9;
            font-weight: 800;
            color: #475569;
        }
        .periods-table td.team-label {
            text-align: left;
            font-weight: 700;
        }
        .rosters-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 24px;
        }
        .roster-card {
            border: 1px solid #CBD5E1;
            border-radius: 6px;
            overflow: hidden;
        }
        .roster-header {
            background: #0F172A;
            color: #FFFFFF;
            padding: 8px 12px;
            font-size: 13px;
            font-weight: 800;
            display: flex;
            justifyContent: space-between;
        }
        .roster-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
        }
        .roster-table th, .roster-table td {
            border-bottom: 1px solid #E2E8F0;
            padding: 6px 8px;
            text-align: left;
        }
        .roster-table th {
            background: #F8FAFC;
            font-weight: 800;
            color: #64748B;
            font-size: 10px;
        }
        .roster-table td.center {
            text-align: center;
        }
        .foul-box {
            display: inline-block;
            width: 13px;
            height: 13px;
            border: 1px solid #94A3B8;
            margin: 0 1px;
            text-align: center;
            line-height: 12px;
            font-size: 9px;
            border-radius: 2px;
        }
        .foul-box.checked {
            background: #DC2626;
            color: #FFFFFF;
            border-color: #DC2626;
            font-weight: 900;
        }
        .signatures-section {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            margin-top: 32px;
            padding-top: 20px;
            border-top: 1px dashed #CBD5E1;
        }
        .signature-box {
            border: 1px solid #E2E8F0;
            border-radius: 6px;
            height: 90px;
            padding: 8px;
            position: relative;
        }
        .signature-title {
            font-size: 10px;
            font-weight: 800;
            color: #64748B;
            text-transform: uppercase;
        }
        .signature-line {
            position: absolute;
            bottom: 12px;
            left: 8px;
            right: 8px;
            border-bottom: 1px solid #94A3B8;
        }
        .footer-note {
            margin-top: 24px;
            text-align: center;
            font-size: 10px;
            color: #94A3B8;
        }

        @media print {
            body {
                background: #FFFFFF;
                padding: 0;
            }
            .page {
                box-shadow: none;
                border: none;
                padding: 0;
                max-width: 100%;
            }
            .toolbar {
                display: none;
            }
        }
    </style>
</head>
<body>

    <div class="toolbar">
        <a href="javascript:history.back()" style="color: #64748B; font-size: 13px; text-decoration: none; font-weight: 600;">‹ Retour à l'application</a>
        <button class="btn-print" onclick="window.print()">
            🖨️ Imprimer ou Enregistrer en PDF
        </button>
    </div>

    <div class="page">
        <!-- En-tête officiel -->
        <div class="header-section">
            <div class="header-left">
                <h1>FEUILLE DE MATCH OFFICIELLE</h1>
                <p>SPORTUP MADAGASCAR • GESTION SPORTIVE EN TEMPS RÉEL</p>
            </div>
            <div class="header-right">
                <span class="badge-status">{{ $match->status === 'finished' ? 'HOMOLOGUÉ' : 'EN DIRECT' }}</span>
                <p style="font-size: 11px; color: #64748B; margin-top: 4px;">ID #SPM-{{ str_pad($match->id, 6, '0', STR_PAD_LEFT) }}</p>
            </div>
        </div>

        <!-- Métadonnées du match -->
        <div class="match-meta-grid">
            <div class="meta-item">
                <strong>Discipline</strong>
                <span>{{ strtoupper($sportName) }}</span>
            </div>
            <div class="meta-item">
                <strong>Date & Heure</strong>
                <span>{{ $match->started_at ? $match->started_at->format('d/m/Y H:i') : now()->format('d/m/Y') }}</span>
            </div>
            <div class="meta-item">
                <strong>Lieu / Terrain</strong>
                <span>{{ $match->session?->location_name ?: 'Antananarivo, Madagascar' }}</span>
            </div>
            <div class="meta-item">
                <strong>Organisateur / Arbitre</strong>
                <span>{{ $match->session?->organizer?->username ?: 'Officiel SportUp' }}</span>
            </div>
        </div>

        <!-- Tableau des Scores -->
        <div class="score-banner">
            <div class="team-box">
                <div class="name">
                    <span class="color-pill" style="background-color: {{ $match->team_a_color ?: '#1456D9' }}"></span>
                    {{ $teamAName }}
                </div>
            </div>

            <div class="score-box">
                @if($isSetSport)
                    <div class="main-score">{{ $match->sets_won_a ?? 0 }} - {{ $match->sets_won_b ?? 0 }}</div>
                    <div class="score-label">SETS GAGNANTS</div>
                @else
                    <div class="main-score">{{ $match->score_team_a }} - {{ $match->score_team_b }}</div>
                    <div class="score-label">SCORE FINAL</div>
                @endif
            </div>

            <div class="team-box">
                <div class="name">
                    <span class="color-pill" style="background-color: {{ $match->team_b_color ?: '#F28B2E' }}"></span>
                    {{ $teamBName }}
                </div>
            </div>
        </div>

        <!-- Ventilation par Périodes / Sets -->
        @if($isSetSport && count($sets) > 0)
            <table class="periods-table">
                <thead>
                    <tr>
                        <th class="team-label">Équipe / Sets</th>
                        @foreach($sets as $s)
                            <th>Set {{ $s->set_number }}</th>
                        @endforeach
                        <th>Total Sets</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="team-label">{{ $teamAName }}</td>
                        @foreach($sets as $s)
                            <td><strong>{{ $s->score_team_a }}</strong></td>
                        @endforeach
                        <td style="font-weight: 900; background: #F8FAFC;">{{ $match->sets_won_a ?? 0 }}</td>
                    </tr>
                    <tr>
                        <td class="team-label">{{ $teamBName }}</td>
                        @foreach($sets as $s)
                            <td><strong>{{ $s->score_team_b }}</strong></td>
                        @endforeach
                        <td style="font-weight: 900; background: #F8FAFC;">{{ $match->sets_won_b ?? 0 }}</td>
                    </tr>
                </tbody>
            </table>
        @elseif(isset($stats['period_scores']) && count($stats['period_scores']) > 0)
            <table class="periods-table">
                <thead>
                    <tr>
                        <th class="team-label">Équipe / Périodes</th>
                        @foreach($stats['period_scores'] as $p)
                            <th>Q{{ $p['period'] }}</th>
                        @endforeach
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="team-label">{{ $teamAName }}</td>
                        @foreach($stats['period_scores'] as $p)
                            <td><strong>{{ $p['team_a'] }}</strong></td>
                        @endforeach
                        <td style="font-weight: 900; background: #F8FAFC;">{{ $match->score_team_a }}</td>
                    </tr>
                    <tr>
                        <td class="team-label">{{ $teamBName }}</td>
                        @foreach($stats['period_scores'] as $p)
                            <td><strong>{{ $p['team_b'] }}</strong></td>
                        @endforeach
                        <td style="font-weight: 900; background: #F8FAFC;">{{ $match->score_team_b }}</td>
                    </tr>
                </tbody>
            </table>
        @endif

        <!-- Compositions des équipes côte à côte -->
        <div class="rosters-grid">
            <!-- Roster Team A -->
            <div class="roster-card">
                <div class="roster-header">
                    <span>{{ strtoupper($teamAName) }}</span>
                    <span>Fautes d'équipe: {{ $match->team_a_fouls ?? 0 }}</span>
                </div>
                <table class="roster-table">
                    <thead>
                        <tr>
                            <th class="center" style="width: 30px;">N°</th>
                            <th>Joueur</th>
                            <th class="center">Fautes</th>
                            <th class="center" style="width: 45px;">Pts</th>
                        </tr>
                    </thead>
                    <tbody>
                        @php
                            $playersA = $match->matchPlayers->where('team_side', 'team_a');
                        @endphp
                        @forelse($playersA as $mp)
                            @php
                                $playerStat = collect($stats['players']['team_a'] ?? [])->firstWhere('user_id', $mp->user_id);
                                $foulsCount = $playerStat['fouls'] ?? 0;
                                $ptsCount = $playerStat['points'] ?? ($playerStat['goals'] ?? 0);
                            @endphp
                            <tr>
                                <td class="center" style="font-weight: 800;">#{{ $mp->jersey_number ?? '-' }}</td>
                                <td>
                                    <strong>{{ $mp->user?->username ?? 'Joueur' }}</strong>
                                    @if($mp->is_starter) <span style="font-size: 9px; color: #64748B;">(T)</span> @endif
                                </td>
                                <td class="center">
                                    @for($i = 1; $i <= 5; $i++)
                                        <span class="foul-box {{ $i <= $foulsCount ? 'checked' : '' }}">{{ $i }}</span>
                                    @endfor
                                </td>
                                <td class="center" style="font-weight: 800;">{{ $ptsCount }}</td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="4" class="center" style="color: #94A3B8; padding: 12px;">Aucun joueur enregistré</td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>

            <!-- Roster Team B -->
            <div class="roster-card">
                <div class="roster-header" style="background-color: #1E293B;">
                    <span>{{ strtoupper($teamBName) }}</span>
                    <span>Fautes d'équipe: {{ $match->team_b_fouls ?? 0 }}</span>
                </div>
                <table class="roster-table">
                    <thead>
                        <tr>
                            <th class="center" style="width: 30px;">N°</th>
                            <th>Joueur</th>
                            <th class="center">Fautes</th>
                            <th class="center" style="width: 45px;">Pts</th>
                        </tr>
                    </thead>
                    <tbody>
                        @php
                            $playersB = $match->matchPlayers->where('team_side', 'team_b');
                        @endphp
                        @forelse($playersB as $mp)
                            @php
                                $playerStat = collect($stats['players']['team_b'] ?? [])->firstWhere('user_id', $mp->user_id);
                                $foulsCount = $playerStat['fouls'] ?? 0;
                                $ptsCount = $playerStat['points'] ?? ($playerStat['goals'] ?? 0);
                            @endphp
                            <tr>
                                <td class="center" style="font-weight: 800;">#{{ $mp->jersey_number ?? '-' }}</td>
                                <td>
                                    <strong>{{ $mp->user?->username ?? 'Joueur' }}</strong>
                                    @if($mp->is_starter) <span style="font-size: 9px; color: #64748B;">(T)</span> @endif
                                </td>
                                <td class="center">
                                    @for($i = 1; $i <= 5; $i++)
                                        <span class="foul-box {{ $i <= $foulsCount ? 'checked' : '' }}">{{ $i }}</span>
                                    @endfor
                                </td>
                                <td class="center" style="font-weight: 800;">{{ $ptsCount }}</td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="4" class="center" style="color: #94A3B8; padding: 12px;">Aucun joueur enregistré</td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Section Signatures Officielles -->
        <div class="signatures-section">
            <div class="signature-box">
                <div class="signature-title">Capitaine Équipe A</div>
                <div class="signature-line"></div>
            </div>
            <div class="signature-box">
                <div class="signature-title">Capitaine Équipe B</div>
                <div class="signature-line"></div>
            </div>
            <div class="signature-box">
                <div class="signature-title">Arbitre Principal / Marqueur</div>
                <div class="signature-line"></div>
            </div>
        </div>

        <div class="footer-note">
            Document généré et certifié par la plateforme SportUp Madagascar (sportup.app) • Imprimé le {{ now()->format('d/m/Y à H:i') }}
        </div>
    </div>

</body>
</html>
