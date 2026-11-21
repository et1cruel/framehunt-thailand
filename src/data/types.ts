export type Region = "Bangkok" | "Central" | "North" | "Northeast" | "East" | "West" | "South";
export type Zone = "A" | "B" | "C";
export type LocationStatus = "published" | "draft" | "archived" | "rejected";
export type PermissionStatus = "allowed" | "needs_permission" | "unknown" | "restricted";
export type VerificationLevel = "verified" | "needs_permission" | "unknown" | "restricted";

export interface TaxonomyCategory {
  slug: string;
  name_th: string;
  name_en: string;
  group: "urban" | "art" | "nature" | "historical";
  icon: string;
}

export interface TaxonomyMood {
  slug: string;
  name_th: string;
  name_en: string;
}

export interface Province {
  slug: string;
  name_th: string;
  name_en: string;
  region: Region;
  zone: Zone;
}

export interface LocationPhoto {
  id: string;
  title: string;
  image_url: string;
  thumb_url: string;
  original_url: string;
  source_name: string;
  source_page_url: string;
  photographer: string;
  credit: string | null;
  license: string;
  license_url: string | null;
  attribution_text: string;
  checksum: string | null;
  perceptual_hash: string | null;
  width: number;
  height: number;
  is_cover: boolean;
  is_verified: boolean;
  verification_status: string;
  subject_evidence: string;
  verification_checks: string[];
  retrieved_at: string;
}

export interface LocationSource {
  source_url: string;
  source_type: string;
  field_verified: string;
  checked_at: string;
}

export interface PermissionInfo {
  permission_status: PermissionStatus;
  contact_details: string | null;
  permission_source: string | null;
  restrictions: string | null;
  verified_at: string | null;
  note: string;
}

export type Tri = "yes" | "no" | "unknown";

export interface FilmingInfo {
  mv_suitability: string | null;
  music_genres: string[];
  recommended_angles: string[];
  best_light_window: string | null;
  artificial_light_allowed: Tri;
  large_equipment_allowed: Tri;
  drone_allowed: Tri;
  drone_note: string;
  sound_restrictions: string;
  dressing_room: string;
  parking: string;
  crew_size: string;
}

export interface CreativeInfo {
  suggested_moods: string[];
  shot_types: string[];
  palette: string[];
  light_window_note: string;
}

export interface LocationRecord {
  id: string;
  slug: string;
  name_th: string;
  name_en: string;
  description_th: string;
  description_en: string;
  description_source:
    { type: "wikipedia"; lang: string; url: string; license: string } | { type: "derived"; note: string };
  province_id: string;
  province: string;
  province_th: string;
  region: Region;
  zone: Zone;
  district: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  coordinate_source: { name: string; url: string; property: string; confidence: number };
  location_type: string;
  architectural_style: string;
  access_status: PermissionStatus;
  filming_permission_status: PermissionStatus;
  estimated_cost: string | null;
  contact_info: string | null;
  website_url: string | null;
  maps_url: string;
  verified_at: string;
  published_at: string | null;
  status: LocationStatus;
  created_at: string;
  updated_at: string;
  categories: string[];
  moods: { slug: string; relevance_score: number }[];
  photos: LocationPhoto[];
  photo_count: number;
  curated_photo_minimum?: 1;
  sources: LocationSource[];
  permission: PermissionInfo;
  filming: FilmingInfo;
  creative: CreativeInfo;
  tags: string[];
  qid: string;
  commons_category: string | null;
  needs_admin_review: boolean;
}

export interface DatasetMeta {
  generated_at: string;
  source: string;
  min_photos_required: number;
  total_locations: number;
  published: number;
  draft: number;
  rejected: number;
  verified_photos: number;
  photographers: number;
  license_breakdown: Record<string, number>;
  disclaimer: string;
}

export interface Dataset {
  meta: DatasetMeta;
  locations: LocationRecord[];
}

export interface SearchFilters {
  q: string;
  province: string;
  region: string;
  categories: string[];
  moods: string[];
  permission: string;
  sort: "relevance" | "distance" | "recent" | "photos";
  verifiedOnly: boolean;
  withPhotosOnly: boolean;
  radiusKm: number | null;
  origin: { lat: number; lng: number } | null;
}

export const emptyFilters: SearchFilters = {
  q: "",
  province: "",
  region: "",
  categories: [],
  moods: [],
  permission: "",
  sort: "relevance",
  verifiedOnly: false,
  withPhotosOnly: true,
  radiusKm: null,
  origin: null,
};

export const searchRadii = [5, 10, 25, 50, 100, 200];

export function radiusFromParam(value: string | null): number | null {
  const radius = Number(value);
  return searchRadii.includes(radius) ? radius : null;
}

export interface BoardItem {
  locationId: string;
  notes: string;
  priority: 1 | 2 | 3;
  addedAt: string;
}

export interface Board {
  id: string;
  title: string;
  description: string;
  items: BoardItem[];
  createdAt: string;
  updatedAt: string;
  coverLocationId?: string;
}

export interface LocalUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "editor" | "member";
  mode: "local" | "supabase";
}

export type SubmissionType = "new-location" | "correction" | "permission-doc";
export type SubmissionStatus = "pending" | "reviewing" | "accepted" | "rejected";

export interface Submission {
  id: string;
  type: SubmissionType;
  name: string;
  province: string;
  description: string;
  coordinates: string;
  sourceUrl: string;
  contact: string;
  photoNote: string;
  permissionNote: string;
  status: SubmissionStatus;
  createdAt: string;
  submitterEmail: string;
}

export interface ContentReport {
  id: string;
  locationSlug: string;
  reason: string;
  detail: string;
  createdAt: string;
  status: "open" | "resolved" | "dismissed";
}
