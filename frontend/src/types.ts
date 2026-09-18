export type Project = {
  id: number;
  name: string;
  description: string | null;
  created_by: number;
  created_at: string;
  site_count: number;
};
export type Site = {
  id: number;
  project_id: number;
  name: string;
  description: string | null;
  coordinates: number[][][];
  area_hectares: number;
  created_at: string;
};
export type Analytics = { year: number; carbon_value: number; biodiversity_index: number };
