export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  plan: "free" | "premium";
  stripe_customer_id: string;
  image: string;
  created_at: string;
}
