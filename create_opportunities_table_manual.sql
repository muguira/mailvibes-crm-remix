-- Manual script to create opportunities table
-- Run this in your Supabase dashboard -> SQL Editor

-- Create opportunities table
CREATE TABLE IF NOT EXISTS public.opportunities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Core opportunity data
    opportunity TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Demo agendada',
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

-- Insert some sample data for testing (optional)
INSERT INTO public.opportunities (
    user_id,
    opportunity,
    status,
    revenue,
    revenue_display,
    close_date,
    owner,
    company_name,
    priority,
    lead_source
) VALUES 
(auth.uid(), 'Taco Muguira', 'Int. de cierre', 5000, '$5,000', '2025-07-30', 'andres@mailvib...', 'Muguira Family', 'High', 'Converted Contact'),
(auth.uid(), '[Sample] Tony Turner', 'Discovered', 3000, '$3,000', '2025-07-30', 'andres@mailvib...', '[Sample] Tony T...', 'Medium', 'Converted Contact'),
(auth.uid(), '[Sample] Kanushi Ba...', 'Discovered', 7500, '$7,500', '2025-07-25', 'andres@mailvib...', '[Sample] Kanush...', 'High', 'Converted Contact'),
(auth.uid(), 'Taco Muguira', 'Qualified', 8000, '$8,000', '2025-07-25', 'andres@mailvib...', 'Muguira Family', 'High', 'Converted Contact'),
(auth.uid(), '[Sample] Githa Watson', 'Discovered', 4500, '$4,500', '2025-07-25', 'andres@mailvib...', '[Sample] Githa ...', 'Medium', 'Converted Contact'),
(auth.uid(), '[Sample] Gloria Quinn', 'Discovered', 6000, '$6,000', '2025-07-25', 'andres@mailvib...', '[Sample] Gloria ...', 'High', 'Converted Contact'),
(auth.uid(), '[Sample] Otto Miller', 'Discovered', 3500, '$3,500', '2025-07-25', 'andres@mailvib...', '[Sample] Otto Mi...', 'Medium', 'Converted Contact'),
(auth.uid(), '[Sample] Peru Zitan', 'Discovered', 5500, '$5,500', '2025-07-25', 'andres@mailvib...', '[Sample] Peru Zi...', 'High', 'Converted Contact'),
(auth.uid(), 'Roger Acosta', 'Discovered', 4000, '$4,000', '2025-08-29', 'andres@mailvib...', 'Internet Mariachi', 'Medium', 'Converted Contact'),
(auth.uid(), 'Diego Olivares', 'Discovered', 6500, '$6,500', '2025-08-29', 'andres@mailvib...', 'Internet Mariachi', 'High', 'Converted Contact'),
(auth.uid(), 'Guillermo Gonzalez', 'Discovered', 2500, '$2,500', '2025-08-29', 'andres@mailvib...', 'QuestionPro', 'Low', 'Converted Contact'),
(auth.uid(), 'Franklin Seriff', 'Discovered', 7000, '$7,000', '2025-08-29', 'andres@mailvib...', 'Internet Mariachi', 'High', 'Converted Contact')
ON CONFLICT (id) DO NOTHING; 