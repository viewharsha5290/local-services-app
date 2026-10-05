-- Real, publicly-listed Toronto service providers to seed the directory so it isn't
-- empty at launch. Sourced from public business listings (see chat history for the
-- search queries used). Deliberately NOT seeded with fake reviews or a "verified"
-- badge — those get earned once real neighbors use the app, same as any provider
-- added later through "Recommend a provider." Run this in the Supabase SQL editor
-- after supabase/schema.sql.
--
-- Coordinates are neighborhood-level approximations (not precise geocoding) — good
-- enough for the app's "nearest" sort, not for turn-by-turn directions.
--
-- `cities` is the provider's service area (can differ from where they're physically
-- based) and must use the exact "City, PR" strings from lib/cities.ts for city-wide
-- search to match them.

insert into providers (name, category, area_note, bio, phone, phone_display, lat, lng, cities) values
-- Handyman
('The HandyForce', 'Handyman', 'East York', 'Trusted handyman and renovation team serving East York & North York.', '+16474277366', '(647) 427-7366', 43.6913, -79.3267, array['Toronto, ON']),
('Tony the Handyman', 'Handyman', 'Toronto & GTA', 'Trusted handyman services across Toronto and the GTA — repairs, painting, furniture assembly.', '+14378185979', '(437) 818-5979', null, null, array['Toronto, ON', 'Mississauga, ON', 'Brampton, ON']),
('Easy Service', 'Handyman', 'Toronto & GTA', 'Reliable handyman and home maintenance service serving Toronto and the GTA.', '+14375184722', '(437) 518-4722', null, null, array['Toronto, ON', 'Vaughan, ON', 'Richmond Hill, ON']),

-- Mechanic
('Fine Tuned Autos', 'Mechanic', 'North York', 'Top-reviewed auto repair shop in North York.', '+14162430949', '(416) 243-0949', 43.7615, -79.4111, array['Toronto, ON']),
('Advanced Automotive Car Care', 'Mechanic', 'North York', 'Full-service auto repair and maintenance, North York.', '+14164470001', '(416) 447-0001', 43.7325, -79.4462, array['Toronto, ON', 'Vaughan, ON']),
('Auto Trust Technicians', 'Mechanic', 'Thornhill', 'Pro mechanics, transparent diagnostics, quality auto repairs.', '+19058816361', '(905) 881-6361', 43.8156, -79.4256, array['Thornhill, ON', 'Markham, ON', 'Richmond Hill, ON', 'Toronto, ON']),

-- Attorney
('Chaudhary Law Office', 'Attorney', 'Don Mills', 'Canadian immigration law — sponsorship, permits, citizenship applications.', '+14164476118', '(416) 447-6118', 43.7223, -79.3389, array['Toronto, ON']),
('Lewis & Associates LLP', 'Attorney', 'Cabbagetown', 'Family and immigration law; 30+ years of experience.', '+14169242227', '(416) 924-2227', 43.6616, -79.3742, array['Toronto, ON']),
('Poonah Immigration Law Firm', 'Attorney', 'Toronto', 'U.S. and Canada immigration services.', '+16476897526', '(647) 689-7526', null, null, array['Toronto, ON', 'Mississauga, ON']),

-- Auditor
('Gondaliya CPA', 'Auditor', 'Downtown Toronto', 'Corporate tax, bookkeeping, HST and payroll for small businesses.', '+16472129559', '(647) 212-9559', 43.6459, -79.386, array['Toronto, ON', 'Mississauga, ON', 'Vaughan, ON']),
('WTC Chartered Professional Accountant', 'Auditor', 'Toronto', 'Accounting, corporate tax and bookkeeping for businesses across the GTA.', '+18449822727', '(844) 982-2727', null, null, array['Toronto, ON', 'Mississauga, ON']),

-- Electrician
('New Toronto Electric', 'Electrician', 'Toronto', 'ESA-licensed electrical contractor, residential and commercial.', '+16476420534', '(647) 642-0534', null, null, array['Toronto, ON']),
('Alkon Electric', 'Electrician', 'Leslieville', '15+ years of professional residential and commercial electrical work.', '+14168820852', '(416) 882-0852', 43.6664, -79.3251, array['Toronto, ON']),
('Langstaff & Sloan', 'Electrician', 'Toronto', 'Residential and commercial electrical services, itemized quotes.', '+14165032033', '(416) 503-2033', null, null, array['Toronto, ON', 'Markham, ON']),

-- Clergy
('Our Lady of Lourdes Parish', 'Clergy', 'Downtown Toronto', 'A vibrant Catholic parish community in the heart of downtown Toronto.', '+14169246257', '(416) 924-6257', 43.6677, -79.3775, array['Toronto, ON']),
('St. Mary''s Parish', 'Clergy', 'King St W / Bathurst', 'Roman Catholic parish in the Entertainment District.', '+14167032326', '(416) 703-2326', 43.6453, -79.4004, array['Toronto, ON']),
('St. Paul''s Basilica', 'Clergy', 'Corktown', 'Historic Roman Catholic basilica near King & Power St.', '+14163647588', '(416) 364-7588', 43.6525, -79.3652, array['Toronto, ON']);
