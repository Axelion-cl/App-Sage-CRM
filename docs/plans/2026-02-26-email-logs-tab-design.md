# Email Detection Log Tab (Option A)

## Purpose
Create a new dedicated page `/dashboard/logs` to visualize how the Gemini LLM is classifying ForceManager emails in real-time. This provides observability into the AI's decision-making process, allowing the user to debug false positives/negatives easily.

## Architecture & Data Flow
1. **Route:** `/src/app/dashboard/logs/page.tsx` (Server Component).
2. **Data Fetching:** 
   - Fetch data directly from the Supabase `tracking_emails` table.
   - We will need to perform a `JOIN` (or manual mapping) with the `fetchFMUsers()` data to display the Sales Rep's real name instead of just `sales_rep_id`.
3. **Fields Displayed:**
   - **Date/Time:** Extracted from `created_at` or `processed_at`.
   - **Subject:** The email subject (`subject`).
   - **Sales Rep:** Mapped from `sales_rep_id`.
   - **Status:** Boolean badge (`is_oc`). ✅ OC / ❌ Rechazado.
   - **LLM Reason:** The detailed `classification_reason` string.

## UI/UX Design (Frontend-Design Skill)
Since this is Option A (Technical Table), the UI will feature:
- A clean, modern table using the project's existing dark theme/glassmorphism aesthetics.
- Sticky headers for easy scrolling.
- Status badges with distinct colors (Emerald Green for ✅ OC, Slate/Red for ❌ No).
- Date picker or simple "Today / Last 7 Days" filter (MVP will likely just sort by descending date and show the latest 100-200 records to keep it simple and performant).

## Implementation Steps
1. Create `src/app/dashboard/logs/page.tsx`.
2. Add a Navigation Link in the main Dashboard header to switch between the Overview and the Logs.
3. Fetch `tracking_emails` ordered by `created_at DESC` limit 100.
4. Fetch `fetchFMUsers()` to map the `sales_rep_id` to names.
5. Render the styled table.
