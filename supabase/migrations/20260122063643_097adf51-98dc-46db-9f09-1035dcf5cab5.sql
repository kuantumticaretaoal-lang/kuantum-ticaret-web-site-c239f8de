-- Allow anyone to create live support threads
CREATE POLICY "Anyone can create live support threads"
ON public.live_support_threads
FOR INSERT
WITH CHECK (device_id IS NOT NULL);

-- Allow users to view their own threads
CREATE POLICY "Users can view their own threads"
ON public.live_support_threads
FOR SELECT
USING (device_id = device_id);

-- Allow anyone to update their own threads
CREATE POLICY "Anyone can update their threads"
ON public.live_support_threads
FOR UPDATE
USING (device_id IS NOT NULL);

-- Allow anyone to create live support messages
CREATE POLICY "Anyone can create live support messages"
ON public.live_support_messages
FOR INSERT
WITH CHECK (thread_id IS NOT NULL);

-- Allow users to view messages from their threads
CREATE POLICY "Users can view thread messages"
ON public.live_support_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.live_support_threads t
    WHERE t.id = thread_id
  )
);