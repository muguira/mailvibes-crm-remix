-- Create opportunities table with proper schema and performance optimizations
CREATE TABLE IF NOT EXISTS public.opportunities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Core opportunity data
    opportunity TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Lead/New',
    revenue NUMERIC(12, 2) DEFAULT 0,
    revenue_display TEXT,
    close_date DATE,
    
    -- Contact and company information
    owner TEXT,
    company_name TEXT,
    website TEXT,
    company_linkedin TEXT,
    employees INTEGER DEFAULT 0,
    
    -- Activity tracking
    last_contacted DATE,
    next_meeting TIMESTAMP WITH TIME ZONE,
    
    -- Lead tracking
    lead_source TEXT,
    priority TEXT DEFAULT 'Medium',
    
    -- Contact relationship
    original_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    
    -- Additional data storage (JSONB for flexibility)
    data JSONB DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_opportunities_user_id ON public.opportunities(user_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON public.opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_priority ON public.opportunities(priority);
CREATE INDEX IF NOT EXISTS idx_opportunities_close_date ON public.opportunities(close_date);
CREATE INDEX IF NOT EXISTS idx_opportunities_created_at ON public.opportunities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_original_contact_id ON public.opportunities(original_contact_id);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_opportunities_user_status ON public.opportunities(user_id, status);
CREATE INDEX IF NOT EXISTS idx_opportunities_user_created ON public.opportunities(user_id, created_at DESC);

-- GIN index for JSONB data field for flexible querying
CREATE INDEX IF NOT EXISTS idx_opportunities_data_gin ON public.opportunities USING GIN(data);

-- Full-text search index for searching across text fields
CREATE INDEX IF NOT EXISTS idx_opportunities_search ON public.opportunities USING GIN(
    to_tsvector('english', 
        COALESCE(opportunity, '') || ' ' || 
        COALESCE(company_name, '') || ' ' || 
        COALESCE(owner, '') || ' ' ||
        COALESCE(lead_source, '')
    )
);

-- Enable Row Level Security
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for opportunities

-- Policy: Users can only see their own opportunities
CREATE POLICY "Users can view own opportunities" ON public.opportunities
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own opportunities
CREATE POLICY "Users can insert own opportunities" ON public.opportunities
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own opportunities
CREATE POLICY "Users can update own opportunities" ON public.opportunities
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own opportunities
CREATE POLICY "Users can delete own opportunities" ON public.opportunities
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_opportunities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at updates
CREATE TRIGGER opportunities_updated_at_trigger
    BEFORE UPDATE ON public.opportunities
    FOR EACH ROW
    EXECUTE FUNCTION update_opportunities_updated_at();

-- Grant necessary permissions
GRANT ALL ON public.opportunities TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Sample data for testing with new pipeline stages (can be removed in production)
-- Note: These use a placeholder user_id - replace with actual user IDs in production
INSERT INTO public.opportunities (
  user_id, opportunity, status, revenue, revenue_display, close_date, 
  owner, company_name, priority, lead_source, created_at
) VALUES 
  ('00000000-0000-0000-0000-000000000000', 'Acme Corp - Enterprise Package', 'Lead/New', 5000, '$5,000', '2024-12-31', 'John Doe', 'Acme Corp', 'High', 'Website', NOW()),
  ('00000000-0000-0000-0000-000000000000', 'Tech Solutions - Consulting Deal', 'Qualified', 10000, '$10,000', '2024-11-30', 'Jane Smith', 'Tech Solutions', 'Medium', 'Referral', NOW()),
  ('00000000-0000-0000-0000-000000000000', 'Global Industries - Software License', 'Discovery', 25000, '$25,000', '2024-12-15', 'Bob Johnson', 'Global Industries', 'High', 'Conference', NOW()),
  ('00000000-0000-0000-0000-000000000000', 'Startup Inc - MVP Development', 'Proposal', 15000, '$15,000', '2024-11-15', 'Alice Chen', 'Startup Inc', 'Medium', 'Partner', NOW()),
  ('00000000-0000-0000-0000-000000000000', 'MegaCorp - Integration Project', 'Negotiation', 50000, '$50,000', '2024-10-30', 'Mike Wilson', 'MegaCorp', 'High', 'Direct', NOW()),
  ('00000000-0000-0000-0000-000000000000', 'LocalBiz - Website Redesign', 'Closing', 8000, '$8,000', '2024-10-15', 'Sarah Davis', 'LocalBiz', 'Medium', 'Social Media', NOW()),
  ('00000000-0000-0000-0000-000000000000', 'Enterprise Corp - Cloud Migration', 'Won', 75000, '$75,000', '2024-09-30', 'David Brown', 'Enterprise Corp', 'High', 'Website', NOW()),
  ('00000000-0000-0000-0000-000000000000', 'SmallCo - Basic Package', 'Lost', 3000, '$3,000', '2024-09-15', 'Emma Taylor', 'SmallCo', 'Low', 'Cold Call', NOW()); 