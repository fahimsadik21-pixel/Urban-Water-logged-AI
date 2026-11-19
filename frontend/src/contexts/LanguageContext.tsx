import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export type Language = 'en' | 'bn';

interface LanguageContextType {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: string) => string;
  formatNumber: (val: number | string) => string;
  formatDate: (val: Date | string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Brand & Nav
    'app.title': 'Urban Water-logged AI',
    'app.subtitle': 'Dhaka Municipal Flood Intelligence & Smart Dewatering',
    'app.brand': 'UrbanAI²',
    'nav.overview': 'Overview',
    'nav.operations': 'Live Operations',
    'nav.intelligence': 'Incident Intelligence',
    'nav.priority': 'Priority Queue',
    'nav.pumps': 'Pump & Safety',
    'nav.fleet': 'IoT & Camera Fleet',
    'nav.public': 'Public & Citizen',
    'nav.admin': 'Admin Command',
    'nav.settings': 'Settings',
    'nav.get_started': 'Get Started',
    'nav.launch_app': 'Live Operations',
    'nav.logout': 'Sign Out',
    'nav.role': 'Role',

    // Hero Section (Quantum² inspired)
    'hero.badge': 'Simulation Benchmark • Dhaka Municipal Pilot (50 Hotspots)',
    'hero.h1.line1': 'Convert Urban Flood Sensing into',
    'hero.h1.line2': 'clear, intelligent dewatering actions',
    'hero.sub.line1': 'From IoT dual-ultrasonic sensors and edge CCTV to automated pump clearing, powered by municipal AI.',
    'hero.sub.line2': 'Skip the manual guesswork.',
    'hero.cta.start': 'Explore Live Operations',
    'hero.cta.download': 'Citizen Portal',

    // Card Mockup
    'card.eyebrow': '# Dhaka Pilot Hotspot #01 / Mirpur-10 Live Sync',
    'card.title': 'Waterlogging Incident Review',
    'card.meta.time': 'Live at 10:30 a.m.',
    'card.meta.depth': '32 cm Depth',
    'card.meta.severity': 'Severe (P1)',
    'card.tab.detection': 'Live Detection',
    'card.tab.ai': 'AI Decision',
    'card.tab.safety': 'Pump Safety',
    'card.tab.debris': 'Debris Status',
    'card.panel.heading': 'Key Telemetry & Actuation Gates',
    'card.row1.title': 'HistGradientBoosting ML: Severe depth confirmed (32 cm)',
    'card.row1.owner': 'Source: Dual-Ultrasonic & CCTV Edge GPU (82% Conf)',
    'card.row2.title': 'Pump #01 Actuated: 8 deterministic safety gates verified',
    'card.row2.owner': 'Interlocks: Canal Capacity OK, Dry-Run Cleared, Temp 42°C',

    // Live Operations Map View
    'map.layer_filters': 'Layer Filters',
    'map.hotspots': 'Water-logging Hotspots (50)',
    'map.canals': 'Drainage Canals (15)',
    'map.hospitals': 'Critical Hospitals (30)',
    'map.road_network': 'Road Network',
    'map.flood_zone': 'Flood Risk Zone',
    'map.admin_boundary': 'Administrative Boundary',
    'map.weather_title': 'Weather / Rain (Simulation)',
    'map.weather_condition': 'Moderate–Heavy Rain',
    'map.weather_rain24h': '24h Rainfall: ~86 mm',
    'map.weather_next3h': 'Next 3h: ~28 mm',
    'map.weather_trend': 'Trend: Increasing ↗',
    'map.active_incidents': 'Active Incidents',
    'map.severity_severe': 'Severe (> 25 cm)',
    'map.severity_high': 'Waterlogged (10–25 cm)',
    'map.severity_watch': 'Watch (2–10 cm)',
    'map.severity_normal': 'Normal (< 2 cm)',
    'map.notifications_title': 'Live Notifications',
    'map.notif_mirpur': 'Severe water-logging at Mirpur-10',
    'map.notif_debris': 'Debris reported (Kallyanpur)',
    'map.notif_water': 'Rising water trend (Uttara Sector-7)',
    'map.notif_pump': 'Drainage pump activated (Mirpur)',
    'map.view_all': 'View All',
    'map.just_now': 'Just now',
    'map.mins_ago': 'min ago',
    'map.legend_title': 'Dhaka Operations Legend',
    'map.style_street': 'Street (OSM)',
    'map.style_satellite': 'Satellite',
    'map.style_dark': 'Dark Ops',

    // Incident Intelligence View
    'intel.title': 'Incident Intelligence',
    'intel.subtitle': 'Detailed analysis, multi-source corroboration and live model explainability',
    'intel.select_location': 'Incident Location',
    'intel.severity': 'Severity',
    'intel.estimated_depth': 'Estimated Depth',
    'intel.model_conf': 'Model Confidence',
    'intel.evidence_conf': 'Evidence Confidence',
    'intel.data_quality': 'Data Quality',
    'intel.evidence_sources': 'Evidence Sources',
    'intel.sensor_ultrasonic': 'Dual Ultrasonic Sensors',
    'intel.camera_cctv': 'Camera (CCTV Edge AI)',
    'intel.citizen_reports': 'Citizen Reports (NLP)',
    'intel.weather_radar': 'Weather (Radar / Met API)',
    'intel.confirmed_all': 'Corroboration: Multi-source confirmed (4/4 channels active)',
    'intel.cctv_feed': 'CCTV Edge AI Live Feed',
    'intel.click_stream': 'Click to stream edge AI feed',
    'intel.debris_alert': 'Debris Alert',
    'intel.debris_desc': 'Solid waste accumulation likely blocking drain inlet. Exercise caution.',
    'intel.road_passability': 'Road Passability',
    'intel.road_passable_desc': 'Not suitable for general traffic. Emergency response & municipal access only.',
    'intel.alt_route': 'Alternative Divert: Begum Rokeya Sarani / Mirpur-14',
    'intel.timeline_title': 'Explainability Timeline (How the incident was determined)',
    'intel.ml_card_title': 'Live ML Model Inference & XAI Feature Attribution',
    'intel.ml_model_name': 'HistGradientBoostingClassifier (95.3% Test Accuracy)',
    'intel.ml_feature_depth': 'Water Depth (Ultrasonic): 42% Impact',
    'intel.ml_feature_rain': '5-Min Rainfall Intensity: 26% Impact',
    'intel.ml_feature_elev': 'Surface Elevation / Ponding: 18% Impact',
    'intel.ml_feature_block': 'Drainage Canal Blockage: 14% Impact',
    'intel.actuate_btn': '⚡ Send Dewatering Actuation Signal',
    'intel.escalate_btn': '⚠️ Escalate Debris to Admin',
    'intel.actuate_success': 'Pump actuation signal securely dispatched through deterministic safety gates.',
    'intel.escalate_success': 'Debris alert escalated to DNCC Municipal Command.',

    // Priority Queue
    'queue.title': 'Priority Queue',
    'queue.subtitle': 'Ranked response queue with decision factors and assignments',
    'queue.col_rank': 'Rank',
    'queue.col_location': 'Location Incident',
    'queue.col_severity': 'Severity',
    'queue.col_priorities': 'Key Priorities',
    'queue.col_mcda': 'MCDA Score',
    'queue.col_assignee': 'Assignee',
    'queue.col_status': 'Status',
    'queue.mcda_title': 'MCDA Factor Breakdown',
    'queue.mcda_depth': 'Flood Severity (Depth & Extent): 35%',
    'queue.mcda_pop': 'Population Exposure: 20%',
    'queue.mcda_hosp': 'Critical Infrastructure (Hospital): 20%',
    'queue.mcda_net': 'Network Impact (Connectivity): 15%',
    'queue.mcda_feas': 'Response Feasibility: 10%',
    'queue.priority_hospital': 'Hospital Route',
    'queue.priority_emergency': 'Emergency Corridor',
    'queue.status_in_progress': 'In Progress',
    'queue.status_assigned': 'Assigned',
    'queue.status_queued': 'Queued',

    // Pump Console
    'pump.title': 'Pump Safety Console',
    'pump.mode': 'Operation Mode',
    'pump.mode_monitor': 'Monitor Only',
    'pump.mode_operator': 'Operator Permission',
    'pump.mode_auto': 'Automatic',
    'pump.mode_estop': 'Emergency Stop',
    'pump.state': 'Pump State',
    'pump.running': 'RUNNING (Automatic)',
    'pump.stopped': 'STANDBY / OFF',
    'pump.flow_rate': 'Flow (Now)',
    'pump.source_level': 'Source Water Level',
    'pump.dest_capacity': 'Destination Drain Capacity',
    'pump.motor_temp': 'Motor Temperature',
    'pump.pipe_blockage': 'Pipe Blockage',
    'pump.dry_run': 'Dry-run Risk',
    'pump.power_stability': 'Power Stability',
    'pump.command_freshness': 'Signed Command Freshness',
    'pump.safety_interlocks': 'Safety Interlocks (8 Deterministic Gates)',
    'pump.all_clear': 'ALL CLEAR (Pump Allowed)',
    'pump.gate_high_water': 'High water level (start condition)',
    'pump.gate_dest_capacity': 'Destination drain capacity sufficient (≤90%)',
    'pump.gate_temp': 'Motor temperature within limit (≤85°C)',
    'pump.gate_blockage': 'No pipe blockage detected',
    'pump.gate_dryrun': 'No dry-run risk',
    'pump.gate_power': 'Power supply stable (398V, 50Hz)',
    'pump.gate_freshness': 'Signed command fresh (≤60s)',
    'pump.gate_integrity': 'System integrity & controls healthy',
    'pump.estop_btn': 'EMERGENCY STOP (E-STOP)',
    'pump.eta_title': 'Response and Clearance ETA',
    'pump.clearance_eta': 'Clearance ETA',
    'pump.ponded_volume': 'Ponded Volume',
    'pump.net_drainage': 'Net Drainage Rate',

    // IoT & Camera Fleet
    'fleet.title': 'IoT Fleet & Camera Edge AI',
    'fleet.tab_fleet': 'IoT Fleet',
    'fleet.tab_camera': 'Camera & Edge AI',
    'fleet.tab_health': 'Data Health',
    'fleet.total_nodes': '50 Total Nodes',
    'fleet.online': 'Online',
    'fleet.offline': 'Offline',
    'fleet.warning': 'Warning',
    'fleet.avg_battery': 'Avg. Battery',
    'fleet.avg_signal': 'Avg. Signal',
    'fleet.cache_queue': 'Cache Queue',
    'fleet.node_id': 'Node ID',
    'fleet.battery': 'Battery',
    'fleet.mains': 'Mains',
    'fleet.network': 'Network',
    'fleet.signal': 'Signal',
    'fleet.last_sync': 'Last Sync',
    'fleet.sensor_health': 'Sensor Health',
    'fleet.cadence': 'Cadence',
    'fleet.filter_all': 'All Status',
    'fleet.camera_total': 'Total Cameras (128)',
    'fleet.camera_ip': 'IP Cameras (86)',
    'fleet.camera_analog': 'Analog DVR (42)',
    'fleet.edge_gpus': 'Edge GPUs (46)',
    'fleet.water_prob': 'Water Prob.',
    'fleet.depth_band': 'Depth Band',
    'fleet.debris_prob': 'Debris Prob.',
    'fleet.road_blocked': 'Road Blockage',
    'fleet.visibility': 'Visibility',
    'fleet.edge_gpu_load': 'Edge GPU',
    'fleet.data_quality': 'Data Quality (with Uncertainty)',
    'fleet.coverage': 'Sensor Coverage',
    'fleet.uncertainty': 'Uncertainty (Avg.)',
    'fleet.anomalies': 'Anomaly Events (24h)',
    'fleet.anomaly_spike': 'Spike (6)',
    'fleet.anomaly_drift': 'Drift (4)',
    'fleet.anomaly_stuck': 'Stuck (2)',
    'fleet.anomaly_missing': 'Missing (3)',

    // Citizen & Public
    'public.title': 'Citizen Reporting & Public Advisories',
    'public.report_heading': 'Report Waterlogging',
    'public.report_sub': 'Help keep Dhaka safer. Report waterlogging, debris, or road blockage.',
    'public.road_status_heading': 'Road Status & Safe Routes',
    'public.road_status_sub': 'Current road conditions in Dhaka, estimated delays, and safer route suggestions.',
    'public.description': 'Description',
    'public.severity_est': 'Severity (estimated)',
    'public.debris_present': 'Debris present (trash / branches)',
    'public.road_blocked_toggle': 'Road blockage (not passable)',
    'public.upload_photo': 'Upload photo (JPG/PNG, up to 10 MB)',
    'public.privacy_notice': 'Privacy & Off-Chain Disclosure: Photos are kept off-chain (secure storage). Only a cryptographic hash is recorded in the audit ledger.',
    'public.submit_btn': 'Submit Report',
    'public.safe_route_title': 'Safe Route Suggestion',
    'public.nearby_alerts': 'Nearby Incident Notifications',

    // Admin Panel
    'admin.title': 'Municipal Command & Governance',
    'admin.subtitle': 'DNCC/DSCC Disaster Management, Waste Dispatch & Account RBAC',
    'admin.debris_dispatch': 'Municipal Solid Waste & Debris Dispatch',
    'admin.debris_sub': 'Post-dewatering debris flagged by CCTV vision and verified by analysts.',
    'admin.dispatch_btn': 'Dispatch DNCC Team',
    'admin.crew_dispatched': 'DNCC Crew Dispatched',
    'admin.user_mgmt': 'User Management & Role Assignment',
    'admin.audit_trail': 'Immutable Audit Ledger (SHA-256 Hash Chain)',

    // Footer
    'footer.realtime': 'Online Realtime',
    'footer.hotspots': 'Hotspots Monitored: 50 / 50',
    'footer.edge_nodes': '50 Edge Nodes Active',
    'footer.disclaimer': 'Simulation Benchmark (Not physical measured Dhaka data)',
    'footer.version': 'v1.0.0-hackathon',

    // Video Demo Tour & Controls
    'tour.title': 'Video Demo Tour',
    'tour.start': 'Start Video Demo Tour',
    'tour.pause': 'Pause Tour',
    'tour.resume': 'Resume Tour',
    'tour.next': 'Next Step',
    'tour.prev': 'Previous Step',
    'tour.reset': 'Reset Tour',
    'tour.exit': 'Exit Tour',
    'tour.stage': 'Stage',
    'tour.of': 'of',
    'tour.auto_play': 'Auto-Play Tour',
    'tour.details': 'Full Panel',

    // Status & Severity
    'status.normal': 'Normal',
    'status.watch': 'Watch',
    'status.waterlogged': 'Waterlogged',
    'status.severe': 'Severe',

    // Priority Classes
    'priority.p1': 'Critical (P1)',
    'priority.p2': 'Elevated (P2)',
    'priority.p3': 'Moderate (P3)',
    'priority.p4': 'Normal (P4)',

    // Empty States
    'empty.no_incidents': 'No active incidents currently queued',
    'empty.no_alerts': 'No active alerts',
    'empty.all_clear': 'All municipal drainage sectors are currently operating within safe bounds.',
    'empty.no_notifications': 'No new notifications at this time',

    // Road Passability Advisories
    'advisory.passable': 'Road passable and traffic moving normally',
    'advisory.caution': 'Drive with caution: surface runoff present',
    'advisory.restricted': 'Restricted: emergency and heavy vehicles only',
    'advisory.impassable': 'Road impassable: severe flood water, avoid area',

    // Deterministic Safety Gates (12 Gates)
    'safety.gate_estop': '1. Emergency manual stop inactive',
    'safety.gate_power': '2. Power supply stable (Mains / Diesel Gen)',
    'safety.gate_spike': '3. Telemetry sensors spike-free and calibrated',
    'safety.gate_water': '4. Source water depth >= 10.0 cm',
    'safety.gate_drain': '5. Destination canal capacity <= 85%',
    'safety.gate_pipe': '6. Discharge conduits unobstructed',
    'safety.gate_dryrun': '7. Dry-run lockout cleared',
    'safety.gate_temp': '8. Motor coil temperature <= 75°C',
    'safety.gate_current': '9. Motor current draw within rated limit',
    'safety.gate_perm': '10. Operating mode and authorization valid',
    'safety.gate_fresh': '11. Operator signed command fresh (<= 300s)',
    'safety.gate_sign': '12. Cryptographic signature and ledger sealed',
  },

  bn: {
    // Brand & Nav
    'app.title': 'আরবান ওয়াটার-লগড এআই',
    'app.subtitle': 'ঢাকা স্মার্ট পানি নিষ্কাশন ও বন্যা পূর্বাভাস প্ল্যাটফর্ম',
    'app.brand': 'নগরAI²',
    'nav.overview': 'সারসংক্ষেপ',
    'nav.operations': 'লাইভ মানচিত্র',
    'nav.intelligence': 'এআই ইনটেলিজেন্স',
    'nav.priority': 'অগ্রাধিকার কিউ',
    'nav.pumps': 'পাম্প ও সেফটি',
    'nav.fleet': 'আইওটি ও ক্যামেরা',
    'nav.public': 'নাগরিক সেবা',
    'nav.admin': 'প্রশাসন',
    'nav.settings': 'সেটিংস',
    'nav.get_started': 'শুরু করুন',
    'nav.launch_app': 'লাইভ অপারেশনস',
    'nav.logout': 'লগআউট',
    'nav.role': 'ভূমিকা',

    // Hero Section (Quantum² inspired)
    'hero.badge': 'সিমুলেশন বেঞ্চমার্ক • ঢাকা সিটি পাইলট (৫০টি হটস্পট)',
    'hero.h1.line1': 'নগরীর জলজটের প্রতিটি সেন্সর তথ্য রূপান্তর করুন',
    'hero.h1.line2': 'সুনির্দিষ্ট, স্বয়ংক্রিয় পানি নিষ্কাশন পদক্ষেপে',
    'hero.sub.line1': 'আইওটি ডুয়াল-সেন্সর ও এজ সিসিটিভি থেকে নিরাপদ স্বয়ংক্রিয় পাম্প নিষ্কাশন ও বর্জ্য অপসারণ।',
    'hero.sub.line2': 'অনুমাননির্ভর কাজকে বলুন বিদায়।',
    'hero.cta.start': 'লাইভ অপারেশনস দেখুন',
    'hero.cta.download': 'নাগরিক পোর্টাল',

    // Card Mockup
    'card.eyebrow': '# ঢাকা পাইলট হটস্পট ০১ / মিরপুর-১০ লাইভ সিঙ্ক',
    'card.title': 'জলাবদ্ধতা পরিস্থিতি ও এআই পর্যালোচনা',
    'card.meta.time': 'লাইভ সকাল ১০:৩০',
    'card.meta.depth': '৩২ সেমি গভীরতা',
    'card.meta.severity': 'অতি-ঝুঁকিপূর্ণ (P1)',
    'card.tab.detection': 'লাইভ শনাক্তকরণ',
    'card.tab.ai': 'এআই সিদ্ধান্ত',
    'card.tab.safety': 'পাম্প সেফটি',
    'card.tab.debris': 'বর্জ্য অপসারণ',
    'card.panel.heading': 'লাইভ টেলিমেট্রি ও সেফটি গেট স্ট্যাটাস',
    'card.row1.title': 'মেশিন লার্নিং প্রেডিকশন: অতি-ঝুঁকিপূর্ণ জলাবদ্ধতা নিশ্চিত (৩২ সেমি)',
    'card.row1.owner': 'উৎস: ডুয়াল-আল্ট্রাসনিক সেন্সর ও এজ সিসিটিভি (৮২% কনফিডেন্স)',
    'card.row2.title': 'পাম্প ০১ সক্রিয়: ৮টি সেফটি ইন্টারলক সফলভাবে যাচাই সম্পন্ন',
    'card.row2.owner': 'সেফটি গেট: ড্রেন ক্যাপাসিটি ৬৮% স্বাভাবিক, মোটর তাপমাত্রা ৪২°C',

    // Live Operations Map View
    'map.layer_filters': 'ম্যাপ লেয়ার ফিল্টার',
    'map.hotspots': 'জলাবদ্ধ হটস্পটসমূহ (৫০)',
    'map.canals': 'ড্রেনেজ খাল ও নালা (১৫)',
    'map.hospitals': 'জরুরি হাসপাতালসমূহ (৩০)',
    'map.road_network': 'সড়ক নেটওয়ার্ক',
    'map.flood_zone': 'প্লাবন ঝুঁকি এলাকা',
    'map.admin_boundary': 'প্রশাসনিক সীমানা',
    'map.weather_title': 'আবহাওয়া / বৃষ্টিপাত (সিমুলেশন)',
    'map.weather_condition': 'মাঝারি থেকে ভারী বৃষ্টিপাত',
    'map.weather_rain24h': '২৪ ঘণ্টার বৃষ্টিপাত: ~৮৬ মিমি',
    'map.weather_next3h': 'পরবর্তী ৩ ঘণ্টা: ~২৮ মিমি',
    'map.weather_trend': 'গতিপ্রকৃতি: বৃদ্ধি পাচ্ছে ↗',
    'map.active_incidents': 'সক্রিয় জলাবদ্ধ পয়েন্ট',
    'map.severity_severe': 'অতি-ঝুঁকিপূর্ণ (> ২৫ সেমি)',
    'map.severity_high': 'জলাবদ্ধ (১০–২৫ সেমি)',
    'map.severity_watch': 'সতর্কতা (২–১০ সেমি)',
    'map.severity_normal': 'স্বাভাবিক (< ২ সেমি)',
    'map.notifications_title': 'লাইভ নোটিফিকেশন',
    'map.notif_mirpur': 'মিরপুর-১০ গোলচত্বরে মারাত্মক জলাবদ্ধতা',
    'map.notif_debris': 'ড্রেনে ময়লা জমেছে (কল্যাণপুর পুল)',
    'map.notif_water': 'পানি বৃদ্ধির লক্ষণ (উত্তরা সেক্টর-৭)',
    'map.notif_pump': 'নিষ্কাশন পাম্প চালু করা হয়েছে (মিরপুর)',
    'map.view_all': 'সব দেখুন',
    'map.just_now': 'এইমাত্র',
    'map.mins_ago': 'মিনিট আগে',
    'map.legend_title': 'ঢাকা অপারেশনস নির্দেশিকা',
    'map.style_street': 'রাস্তার মানচিত্র (OSM)',
    'map.style_satellite': 'স্যাটেলাইট ইমেজারি',
    'map.style_dark': 'ডার্ক মোড',

    // Incident Intelligence View
    'intel.title': 'ইনসিডেন্ট ইনটেলিজেন্স ও এআই ব্যাখ্যা',
    'intel.subtitle': 'বিস্তারিত তথ্য বিশ্লেষণ, বহু-উৎস যাচাইকরণ ও লাইভ মেশিন লার্নিং এক্সপ্লেইনাবিলিটি',
    'intel.select_location': 'জলাবদ্ধতার অবস্থান নির্বাচন',
    'intel.severity': 'তীব্রতা',
    'intel.estimated_depth': 'আনুমানিক গভীরতা',
    'intel.model_conf': 'মডেল কনফিডেন্স',
    'intel.evidence_conf': 'তথ্য প্রমাণ কনফিডেন্স',
    'intel.data_quality': 'ডাটার গুণমান',
    'intel.evidence_sources': 'যাচাইকৃত তথ্যসূত্র',
    'intel.sensor_ultrasonic': 'ডুয়াল আল্ট্রাসনিক সেন্সর',
    'intel.camera_cctv': 'সিসিটিভি ক্যামেরা (এজ এআই)',
    'intel.citizen_reports': 'নাগরিক রিপোর্ট (এনএলপি)',
    'intel.weather_radar': 'আবহাওয়া রাডার / লাইভ এপিআই',
    'intel.confirmed_all': 'যাচাইকরণ: বহু-উৎস নিশ্চিত (৪/৪টি উৎস সক্রিয়)',
    'intel.cctv_feed': 'সিসিটিভি এজ এআই লাইভ ফিড',
    'intel.click_stream': 'এজ এআই লাইভ ফিড দেখতে ক্লিক করুন',
    'intel.debris_alert': 'বর্জ্য ও ময়লা সতর্কতা',
    'intel.debris_desc': 'ড্রেনের মুখে কঠিন বর্জ্য ও পলিথিন আটকে পানি প্রবাহ বাধাগ্রস্ত হচ্ছে। সাবধানতা অবলম্বন করুন।',
    'intel.road_passability': 'রাস্তার চলাচল যোগ্যতা',
    'intel.road_passable_desc': 'সাধারণ যানবাহন চলাচলের উপযোগী নয়। শুধুমাত্র জরুরি অ্যাম্বুলেন্স ও সরকারি উদ্ধারকাজে প্রবেশযোগ্য।',
    'intel.alt_route': 'বিকল্প সড়ক: বেগম রোকেয়া সরণি / মিরপুর-১৪ ব্যবহার করুন',
    'intel.timeline_title': 'ঘটনার এআই সিদ্ধান্ত টাইমলাইন (কীভাবে নির্ধারিত হলো)',
    'intel.ml_card_title': 'লাইভ এআই মডেল প্রেডিকশন ও সিদ্ধান্ত ব্যাখ্যাকারী (XAI)',
    'intel.ml_model_name': 'HistGradientBoostingClassifier (৯৫.৩% টেস্ট একুরেসি)',
    'intel.ml_feature_depth': 'পানির গভীরতা (আল্ট্রাসনিক): ৪২% প্রভাব',
    'intel.ml_feature_rain': '৫ মিনিটের বৃষ্টিপাতের তীব্রতা: ২৬% প্রভাব',
    'intel.ml_feature_elev': 'ভৌগোলিক নিচু এলাকা: ১৮% প্রভাব',
    'intel.ml_feature_block': 'ড্রেনেজ ক্যানেল ব্লকেজ: ১৪% প্রভাব',
    'intel.actuate_btn': '⚡ পানি নিষ্কাশনে পাম্প চালু করুন',
    'intel.escalate_btn': '⚠️ বর্জ্য অপসারণে প্রশাসনকে জানান',
    'intel.actuate_success': '৮টি সেফটি ইন্টারলক যাচাই করে পাম্পে নিষ্কাশন সংকেত পাঠানো হয়েছে।',
    'intel.escalate_success': 'ডিএনসিসি কেন্দ্রীয় কমান্ড সেন্টারে পরিচ্ছন্নতার অ্যালার্ট পাঠানো হয়েছে।',

    // Priority Queue
    'queue.title': 'অগ্রাধিকার তালিকা (Priority Queue)',
    'queue.subtitle': 'MCDA বহু-মানদণ্ড সিদ্ধান্তের ভিত্তিতে জরুরি ক্রমতালিকা',
    'queue.col_rank': 'ক্রম',
    'queue.col_location': 'জলাবদ্ধতার স্থান',
    'queue.col_severity': 'তীব্রতা',
    'queue.col_priorities': 'প্রধান জরুরি বিষয়',
    'queue.col_mcda': 'MCDA স্কোর',
    'queue.col_assignee': 'দায়িত্বপ্রাপ্ত',
    'queue.col_status': 'অবস্থা',
    'queue.mcda_title': 'MCDA সিদ্ধান্ত মানদণ্ড বিভাজন',
    'queue.mcda_depth': 'প্লাবনের গভীরতা ও বিস্তার: ৩৫%',
    'queue.mcda_pop': 'জনঘনত্ব ও চলাচল: ২০%',
    'queue.mcda_hosp': 'জরুরি হাসপাতাল সংযোগ: ২০%',
    'queue.mcda_net': 'সড়ক নেটওয়ার্ক প্রভাব: ১৫%',
    'queue.mcda_feas': 'উদ্ধার ও নিষ্কাশন সম্ভাব্যতা: ১০%',
    'queue.priority_hospital': 'হাসপাতাল রুট',
    'queue.priority_emergency': 'জরুরি করিডোর',
    'queue.status_in_progress': 'চলমান',
    'queue.status_assigned': 'নিযুক্ত',
    'queue.status_queued': 'অপেক্ষমাণ',

    // Pump Console
    'pump.title': 'স্মার্ট পাম্প কন্ট্রোল ও সেফটি কনসোল',
    'pump.mode': 'অপারেশন মোড',
    'pump.mode_monitor': 'শুধু মনিটরিং',
    'pump.mode_operator': 'অপারেটর অনুমতি',
    'pump.mode_auto': 'স্বয়ংক্রিয়',
    'pump.mode_estop': 'ইমার্জেন্সি স্টপ',
    'pump.state': 'পাম্পের অবস্থা',
    'pump.running': 'সক্রিয় (RUNNING - অটোমেটিক)',
    'pump.stopped': 'বন্ধ রয়েছে (STANDBY)',
    'pump.flow_rate': 'বর্তমান পানি প্রবাহ',
    'pump.source_level': 'পানির উৎস স্তর',
    'pump.dest_capacity': 'নিষ্কাশন ড্রেন ধারণক্ষমতা',
    'pump.motor_temp': 'মোটরের তাপমাত্রা',
    'pump.pipe_blockage': 'পাইপলাইন ব্লকেজ',
    'pump.dry_run': 'ড্রাই-রান ঝুঁকি',
    'pump.power_stability': 'বিদ্যুৎ সরবরাহ',
    'pump.command_freshness': 'ডিজিটাল কমান্ড ফ্রেশনেস',
    'pump.safety_interlocks': 'নিরাপত্তা ইন্টারলক (৮টি সুনির্দিষ্ট গেট)',
    'pump.all_clear': 'সব ঠিক আছে (পাম্প চালুর অনুমতিপ্রাপ্ত)',
    'pump.gate_high_water': 'উচ্চ পানি স্তর (চালু হওয়ার শর্ত)',
    'pump.gate_dest_capacity': 'নিষ্কাশন ড্রেনের পর্যাপ্ত ধারণক্ষমতা (≤ ৯০%)',
    'pump.gate_temp': 'মোটরের তাপমাত্রা স্বাভাবিক সীমার মধ্যে (≤ ৮৫°C)',
    'pump.gate_blockage': 'পাইপলাইনে কোনো বাধা বা জ্যাম নেই',
    'pump.gate_dryrun': 'ড্রাই-রান বা শূন্যে চলার ঝুঁকি নেই',
    'pump.gate_power': 'বিদ্যুৎ প্রবাহ স্থিতিশীল (৩৯৮ ভোল্ট, ৫০ হার্টজ)',
    'pump.gate_freshness': 'ডিজিটাল কমান্ড সাম্প্রতিক (≤ ৬০ সেকেন্ড)',
    'pump.gate_integrity': 'হার্ডওয়্যার ও কন্ট্রোলারের কার্যকারিতা স্বাভাবিক',
    'pump.estop_btn': 'জরুরি স্টপ বাটন (E-STOP)',
    'pump.eta_title': 'পানি অপসারণের সময়কাল (ETA)',
    'pump.clearance_eta': 'সম্পূর্ণ নিষ্কাশন সময় (ETA)',
    'pump.ponded_volume': 'জমে থাকা পানির পরিমাণ',
    'pump.net_drainage': 'নেট নিষ্কাশন হার',

    // IoT & Camera Fleet
    'fleet.title': 'আইওটি ফ্লিট ও ক্যামেরা এজ এআই',
    'fleet.tab_fleet': 'আইওটি সেন্সর নোড',
    'fleet.tab_camera': 'সিসিটিভি ও এজ এআই',
    'fleet.tab_health': 'ডাটার সার্বিক অবস্থা',
    'fleet.total_nodes': '৫০টি সক্রিয় নোড',
    'fleet.online': 'অনলাইন',
    'fleet.offline': 'অফলাইন',
    'fleet.warning': 'সতর্কতা',
    'fleet.avg_battery': 'গড় ব্যাটারি লেভেল',
    'fleet.avg_signal': 'গড় নেটওয়ার্ক সিগন্যাল',
    'fleet.cache_queue': 'অফলাইন ক্যাশ কিউ',
    'fleet.node_id': 'নোড আইডি',
    'fleet.battery': 'ব্যাটারি',
    'fleet.mains': 'বিদ্যুৎ সংযোগ',
    'fleet.network': 'নেটওয়ার্ক',
    'fleet.signal': 'সিগন্যাল',
    'fleet.last_sync': 'সর্বশেষ ডাটা সিঙ্ক',
    'fleet.sensor_health': 'সেন্সর স্বাস্থ্য',
    'fleet.cadence': 'পোলিং হার',
    'fleet.filter_all': 'সকল অবস্থা',
    'fleet.camera_total': 'মোট ক্যামেরা (১২৮)',
    'fleet.camera_ip': 'আইপি ক্যামেরা (৮৬)',
    'fleet.camera_analog': 'অ্যানালগ ডিভিআর (৪২)',
    'fleet.edge_gpus': 'এজ জিপিইউ (৪৬)',
    'fleet.water_prob': 'পানির সম্ভাবনা',
    'fleet.depth_band': 'গভীরতা স্তর',
    'fleet.debris_prob': 'ময়লার সম্ভাবনা',
    'fleet.road_blocked': 'সড়ক বন্ধের ঝুঁকি',
    'fleet.visibility': 'দৃশ্যমানতা',
    'fleet.edge_gpu_load': 'এজ জিপিইউ',
    'fleet.data_quality': 'ডাটার গুণমান (অনিশ্চয়তাসহ)',
    'fleet.coverage': 'সেন্সর কভারেজ',
    'fleet.uncertainty': 'গড় অনিশ্চয়তা',
    'fleet.anomalies': 'অস্বাভাবিকতা ইভেন্ট (২৪ ঘণ্টা)',
    'fleet.anomaly_spike': 'হঠাৎ বৃদ্ধি / স্পাইক (৬)',
    'fleet.anomaly_drift': 'ধীর পরিবর্তন / ড্রিফট (৪)',
    'fleet.anomaly_stuck': 'আটকে থাকা রিডিং (২)',
    'fleet.anomaly_missing': 'মিসিং রিডিং (৩)',

    // Citizen & Public
    'public.title': 'নাগরিক সেবা ও ট্রাফিক সতর্কতা',
    'public.report_heading': 'জলাবদ্ধতার তথ্য জানান',
    'public.report_sub': 'আপনার তথ্য ঢাকাকে রাখবে নিরাপদ। জলাবদ্ধতা, ড্রেনে ময়লা বা রাস্তা বন্ধের খবর দিন।',
    'public.road_status_heading': 'রাস্তার অবস্থা ও নিরাপদ রুট',
    'public.road_status_sub': 'ঢাকার প্রধান সড়কগুলোর বর্তমান অবস্থা, যানজটের সময়কাল ও বিকল্প নিরাপদ পথ।',
    'public.description': 'বিবরণ লিখুন',
    'public.severity_est': 'আনুমানিক পানির গভীরতা',
    'public.debris_present': 'ময়লা বা ডালপালা জমেছে',
    'public.road_blocked_toggle': 'রাস্তা সম্পূর্ণ বন্ধ (চলাচল অনুপযোগী)',
    'public.upload_photo': 'ছবি আপলোড করুন (JPG/PNG, সর্বোচ্চ ১০ মেগাবাইট)',
    'public.privacy_notice': 'গোপনীয়তা সুরক্ষা: মূল ছবি পাবলিকলি শেয়ার করা হয় না, শুধুমাত্র একটি ক্রিপ্টোগ্রাফিক হ্যাশ অডিট লেজারে সংরক্ষিত থাকে।',
    'public.submit_btn': 'তথ্য সাবমিট করুন',
    'public.safe_route_title': 'নিরাপদ যাতায়াতের রুট সাজেশন',
    'public.nearby_alerts': 'আশেপাশের সতর্কতা নোটিফিকেশন',

    // Admin Panel
    'admin.title': 'সিটি কর্পোরেশন কমান্ড ও সুশাসন',
    'admin.subtitle': 'ডিএনসিসি / ডিএসসিসি দুর্যোগ ব্যবস্থাপনা, বর্জ্য অপসারণ ও অ্যাকাউন্ট নিয়ন্ত্রণ',
    'admin.debris_dispatch': 'কঠিন বর্জ্য ও ড্রেন পরিষ্কার কর্মী প্রেরণ',
    'admin.debris_sub': 'পানি নিষ্কাশনের পর সিসিটিভি ক্যামেরা ও বিশ্লেষক দ্বারা চিহ্নিত জমে থাকা ময়লা।',
    'admin.dispatch_btn': 'ডিএনসিসি টিম পাঠান',
    'admin.crew_dispatched': 'ডিএনসিসি টিম পাঠানো হয়েছে',
    'admin.user_mgmt': 'ইউজার ম্যানেজমেন্ট ও দায়িত্ব বণ্টন',
    'admin.audit_trail': 'অপরিবর্তনীয় অডিট লেজার (SHA-256 হ্যাশ চেইন)',

    // Footer
    'footer.realtime': 'অনলাইন রিয়েল-টাইম',
    'footer.hotspots': 'নজরদারিকৃত হটস্পট: ৫০ / ৫০',
    'footer.edge_nodes': '৫০টি এজ নোড সক্রিয়',
    'footer.disclaimer': 'সিমুলেশন বেঞ্চমার্ক (ঢাকার বাস্তব পরিমাপকৃত ডাটা নয়)',
    'footer.version': 'সংস্করণ ১.০.০',

    // Video Demo Tour & Controls
    'tour.title': 'ভিডিও ডেমো ট্যুর',
    'tour.start': 'ভিডিও ডেমো ট্যুর শুরু করুন',
    'tour.pause': 'ট্যুর পজ করুন',
    'tour.resume': 'ট্যুর চালু রাখুন',
    'tour.next': 'পরবর্তী ধাপ',
    'tour.prev': 'পূর্ববর্তী ধাপ',
    'tour.reset': 'পুনরায় শুরু (Reset)',
    'tour.exit': 'ট্যুর সমাপ্ত',
    'tour.stage': 'ধাপ',
    'tour.of': 'এর',
    'tour.auto_play': 'অটো-প্লে ট্যুর',
    'tour.details': 'পূর্ণাঙ্গ প্যানেল',

    // Status & Severity
    'status.normal': 'স্বাভাবিক',
    'status.watch': 'সতর্কতা',
    'status.waterlogged': 'জলাবদ্ধতা',
    'status.severe': 'গুরুতর',

    // Priority Classes
    'priority.p1': 'অতি জরুরি (P1)',
    'priority.p2': 'উচ্চ (P2)',
    'priority.p3': 'মাঝারি (P3)',
    'priority.p4': 'স্বাভাবিক (P4)',

    // Empty States
    'empty.no_incidents': 'বর্তমানে কোনো সক্রিয় ঘটনা অপেক্ষমান নেই',
    'empty.no_alerts': 'কোনো সক্রিয় সতর্কতা নেই',
    'empty.all_clear': 'সকল ড্রেনেজ চ্যানেল ও সড়কে পানি প্রবাহ স্বাভাবিক রয়েছে।',
    'empty.no_notifications': 'বর্তমানে কোনো নতুন নোটিফিকেশন নেই',

    // Road Passability Advisories
    'advisory.passable': 'রাস্তা স্বাভাবিক ও যান চলাচল উপযোগী',
    'advisory.caution': 'সাবধানে চলুন: সড়কে বৃষ্টির পানি রয়েছে',
    'advisory.restricted': 'চলাচল সীমিত: শুধুমাত্র জরুরি সেবার গাড়ি চলাচল করতে পারবে',
    'advisory.impassable': 'রাস্তা সম্পূর্ণ বন্ধ: অতি তীব্র জলাবদ্ধতা, বিকল্প পথ ব্যবহার করুন',

    // Deterministic Safety Gates (12 Gates)
    'safety.gate_estop': '১. ইমার্জেন্সি স্টপ নিষ্ক্রিয়',
    'safety.gate_power': '২. বিদ্যুৎ শক্তি উপলব্ধ (জেনারেটর / মেইনস)',
    'safety.gate_spike': '৩. সেন্সর স্পাইক মুক্ত ও নির্ভরযোগ্য',
    'safety.gate_water': '৪. পানির স্তর নিরাপদ (>= ১০.০ সেমি)',
    'safety.gate_drain': '৫. ড্রেন ধারণক্ষমতা পর্যাপ্ত (<= ৮৫%)',
    'safety.gate_pipe': '৬. ডিসচার্জ পাইপ ব্লকেজ মুক্ত',
    'safety.gate_dryrun': '৭. ড্রাই-রান ইন্টারলক নিষ্ক্রিয়',
    'safety.gate_temp': '৮. মোটর তাপমাত্রা নিরাপদ (<= ৭৫°C)',
    'safety.gate_current': '৯. মোটর কারেন্ট নিরাপদ সীমার মধ্যে',
    'safety.gate_perm': '১০. অপারেটিং মোড ও অনুমতিপত্র বৈধ',
    'safety.gate_fresh': '১১. কমান্ডের বয়স নিরাপদ (<= ৩০০ সে)',
    'safety.gate_sign': '১২. ক্রিপ্টোগ্রাফিক ডিজিটাল সাইন সম্পন্ন',
  },
};

/** Format numbers into authentic Bengali numerals when Bangla is active */
export function formatNumber(val: number | string, currentLang: Language = 'bn'): string {
  if (currentLang === 'bn') {
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(val).replace(/\d/g, (d) => bnDigits[Number(d)]);
  }
  return String(val);
}

/** Format dates into localized Dhaka formatting */
export function formatDate(date: Date | string, currentLang: Language = 'bn'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(currentLang === 'bn' ? 'bn-BD' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'bn',
  setLang: () => {},
  t: (k) => k,
  formatNumber: (v) => String(v),
  formatDate: (d) => String(d),
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('app_lang');
    return (saved === 'en' || saved === 'bn') ? saved : 'bn'; // default to Bengali
  });

  const setLang = (l: Language) => {
    setLangState(l);
    localStorage.setItem('app_lang', l);
  };

  const t = (key: string): string => {
    const val = translations[lang]?.[key];
    if (!val) {
      if (typeof window !== 'undefined' && (window as any).__DEV__) {
        console.warn(`[i18n] Missing translation for key '${key}' in language '${lang}'`);
      }
      return translations[lang === 'bn' ? 'en' : 'bn']?.[key] || key;
    }
    return val;
  };

  const localizedFormatNumber = useCallback((val: number | string) => formatNumber(val, lang), [lang]);
  const localizedFormatDate = useCallback((val: Date | string) => formatDate(val, lang), [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLang,
        t,
        formatNumber: localizedFormatNumber,
        formatDate: localizedFormatDate,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
