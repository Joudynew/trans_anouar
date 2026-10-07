import { Avatar } from '@/components/Avatar';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { useUnreadMessages } from '@/lib/unreadMessages';
import { Modal } from '@/components/Modal';
import { Spinner, EmptyState } from '@/components/Feedback';
import { PageHeader } from '@/components/AdminLayout';
import { timeAgo } from '@/lib/constants';
import type { Channel, Message, Profile } from '@/lib/types';
import {
  listChannels as dbListChannels,
  createChannel as dbCreateChannel,
  addChannelMember as dbAddChannelMember,
  listMessages as dbListMessages,
  sendMessage as dbSendMessage,
  type ChannelDbRow,
  type MessageDbRow,
} from '@/lib/api';
import { subscribeToChanges, notifyDbChange } from '@/lib/realtime';
import { Hash, Send, MessageSquare, Plus, ArrowLeft, UserPlus } from 'lucide-react';

function toChannel(r: ChannelDbRow): Channel {
  return {
    id: r.id,
    name: r.name,
    type: r.type.toLowerCase() as Channel['type'],
    created_at: r.created_at,
    organization_id: r.organization_id
  };
}

function toMessage(r: MessageDbRow): Message {
  return {
    id: r.id,
    channel_id: r.channel_id,
    sender_id: r.sender_id,
    content: r.content,
    created_at: r.created_at,
    sender: r.sender ? {
      id: r.sender.id,
      full_name: r.sender.full_name,
      email: r.sender.email,
      phone: (r.sender as unknown as { phone?: string | null })?.phone ?? null,
      role: ((r.sender as unknown as { role?: string })?.role ?? 'technician') as Profile['role'],
      status: ((r.sender as unknown as { status?: string })?.status ?? 'active') as Profile['status'],
      organization_id: (r.sender as unknown as { organization_id?: string | null })?.organization_id ?? null,
      avatar_url: (r.sender as unknown as { avatar_url?: string | null })?.avatar_url ?? null,
      created_at: (r.sender as unknown as { created_at?: string })?.created_at ?? new Date().toISOString(),
    } : undefined,
  };
}

export function AdminMessages({ technicians }: { technicians: Profile[] }) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { isChannelUnread, markChannelRead, lastMessages } = useUnreadMessages();
  const orgId = profile?.organization_id ?? 'default-org';
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadChannels = useCallback(async () => {
    if (!user) return;
    try {
      const rows = await dbListChannels(orgId);
      const mapped = rows.map(toChannel);
      setChannels(mapped);
      setActiveChannel((prev) => prev ?? (mapped.length > 0 ? mapped[0].id : null));
      setLoading(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur.';
      toast(msg, 'error');
    }
  }, [user, orgId, toast]);

  const loadMessages = useCallback(async () => {
    if (!activeChannel) return;
    try {
      const rows = await dbListMessages(activeChannel);
      const mapped = rows.map(toMessage);
      setMessages(mapped);
      if (mapped.length > 0) {
        markChannelRead(activeChannel, mapped[mapped.length - 1].created_at);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur.';
      toast(msg, 'error');
    }
  }, [activeChannel, toast, markChannelRead]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadChannels();
  }, [loadChannels]);

  useEffect(() => {
    if (activeChannel) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadMessages();
    }
  }, [activeChannel, loadMessages]);

  // Temps réel
  useEffect(() => {
    if (!activeChannel) return;
    const unsub = subscribeToChanges(() => loadMessages());
    return () => { unsub(); };
  }, [activeChannel, loadMessages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const dmDisplayName = useMemo(
    () => (ch: Channel | undefined) => {
      if (!ch || !profile) return '';
      if (ch.type === 'group') return ch.name;
      return ch.name.replace(/^DM:\s*/, '').split(' ↔ ').find((n) => n !== profile.full_name) ?? ch.name;
    },
    [profile]
  );

  const channelMetas: { channel: Channel; lastMessage: Message | null; unreadCount: number; displayName: string }[] = channels.map((ch) => {
    const lastMsg = lastMessages[ch.id] ?? null;
    const unread = isChannelUnread(ch.id);
    return { channel: ch, lastMessage: lastMsg, unreadCount: unread ? 1 : 0, displayName: dmDisplayName(ch) };
  }).sort((a, b) => {
    if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
    const aTime = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0;
    const bTime = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0;
    return bTime - aTime;
  });

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeChannel || !user) return;
    const content = newMsg.trim();
    setNewMsg('');
    setSending(true);
    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      channel_id: activeChannel,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
      sender: profile ? { ...profile } : undefined,
    };
    setMessages((prev) => [...prev, tempMsg]);
    try {
      await dbSendMessage(activeChannel, user.id, content);
      notifyDbChange();
      await loadMessages();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur d\'envoi.';
      toast(msg, 'error');
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
      setNewMsg(content);
    } finally {
      setSending(false);
    }
  };

  const createChannel = async () => {
    if (!user || !newChannelName.trim()) return;
    setCreatingChannel(true);
    try {
      const chId = await dbCreateChannel(orgId, newChannelName.trim(), 'group');
      await dbAddChannelMember(chId, user.id);
      for (const t of technicians.filter((t) => t.status === 'active' && t.role === 'technician' && t.id !== user.id)) {
        await dbAddChannelMember(chId, t.id);
      }
      notifyDbChange();
      toast('Canal créé.', 'success');
      setShowNewChannel(false);
      setNewChannelName('');
      await loadChannels();
      setActiveChannel(chId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur de création.';
      toast(msg, 'error');
    } finally {
      setCreatingChannel(false);
    }
  };

  const createDM = async (techId: string) => {
    if (!user || !profile) return;
    const tech = technicians.find((t) => t.id === techId);
    if (!tech) return;

    const existingDM = channels.find(
      (c) => c.type === 'dm' && c.name.includes(tech.full_name) && c.name.includes(profile.full_name)
    );
    if (existingDM) {
      setActiveChannel(existingDM.id);
      setShowNewChannel(false);
      return;
    }

    setCreatingChannel(true);
    try {
      const dmName = `DM: ${profile.full_name} ↔ ${tech.full_name}`;
      const chId = await dbCreateChannel(orgId, dmName, 'dm', techId);
      await dbAddChannelMember(chId, user.id);
      await dbAddChannelMember(chId, techId);
      notifyDbChange();
      toast('Discussion privée créée.', 'success');
      setShowNewChannel(false);
      await loadChannels();
      setActiveChannel(chId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur de création.';
      toast(msg, 'error');
    } finally {
      setCreatingChannel(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Messages" subtitle="Communiquez avec votre équipe" />
        <div className="flex justify-center py-20"><Spinner size={24} /></div>
      </div>
    );
  }

  const activeCh = channels.find((c) => c.id === activeChannel);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Messages"
        subtitle="Communiquez avec votre équipe"
        action={
          <button onClick={() => setShowNewChannel(true)} className="btn-primary">
            <Plus size={16} />
            Nouveau
          </button>
        }
      />

      <div className="card flex h-[calc(100vh-12rem)] min-h-[400px] overflow-hidden">
        {/* Channel list */}
        <div className={`w-48 sm:w-56 border-r border-white/[0.06] p-3 overflow-y-auto shrink-0 ${activeChannel ? 'hidden sm:block' : 'block'}`}>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium px-2 mb-2">Canaux</div>
          <div className="space-y-0.5">
            {channelMetas.map(({ channel: c, unreadCount, lastMessage, displayName }) => (
              <button
                key={c.id}
                onClick={() => setActiveChannel(c.id)}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors relative ${
                  activeChannel === c.id ? 'bg-sky-500/10 text-sky-300' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                {c.type === 'group' ? <Hash size={14} className="shrink-0" /> : <MessageSquare size={14} className="shrink-0" />}
                <span className="truncate flex-1 text-left">{displayName}</span>
                {unreadCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                )}
                {lastMessage && unreadCount === 0 && (
                  <span className="text-[9px] text-slate-600 shrink-0">{timeAgo(lastMessage.created_at)}</span>
                )}
              </button>
            ))}
            {channels.length === 0 && (
              <div className="text-xs text-slate-600 px-2 py-4">Aucun canal.</div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className={`flex-1 flex flex-col min-w-0 ${activeChannel ? 'flex' : 'hidden sm:flex'}`}>
          {activeCh ? (
            <>
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2 shrink-0">
                {activeChannel && (
                  <button onClick={() => setActiveChannel(null)} className="sm:hidden btn-ghost p-1 rounded-lg">
                    <ArrowLeft size={18} />
                  </button>
                )}
                {activeCh.type === 'group' ? <Hash size={16} className="text-slate-500" /> : <MessageSquare size={16} className="text-sky-400" />}
                <span className="text-sm font-medium text-slate-200 truncate">{dmDisplayName(activeCh)}</span>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare size={32} className="text-slate-600 mb-2" />
                    <p className="text-sm text-slate-500">Aucun message pour le moment.</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isOwn = m.sender_id === user?.id;
                    return (
                      <div key={m.id} className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                        <Avatar user={m.sender} size={28} />
                        <div className={`max-w-[75%] flex flex-col ${isOwn ? 'items-end' : ''}`}>
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <span className="text-xs font-medium text-slate-300">
                              {isOwn ? 'Vous' : (m.sender?.full_name ?? 'Utilisateur')}
                            </span>
                            <span className="text-[10px] text-slate-500">{timeAgo(m.created_at)}</span>
                          </div>
                          <div className={`rounded-xl px-3 py-2 text-sm leading-relaxed ${
                            isOwn ? 'bg-sky-500/15 text-sky-100 border border-sky-500/20' : 'bg-white/[0.04] text-slate-200 border border-white/[0.06]'
                          }`}>
                            {m.content}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="p-3 border-t border-white/[0.06] shrink-0">
                <div className="flex items-center gap-2">
                  <input
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    className="input flex-1"
                    placeholder="Votre message…"
                  />
                  <button onClick={sendMessage} disabled={sending || !newMsg.trim()} className="btn-primary px-3">
                    {sending ? <Spinner size={16} /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState icon={<MessageSquare size={24} className="text-slate-500" />} title="Sélectionnez un canal" description="Choisissez une conversation dans la liste." />
            </div>
          )}
        </div>
      </div>

      <Modal open={showNewChannel} onClose={() => setShowNewChannel(false)} title="Nouvelle conversation" size="md">
        <div className="space-y-4">
          <div>
            <label className="label">Canal de groupe</label>
            <div className="flex gap-2">
              <input value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} className="input" placeholder="Nom du canal…" onKeyDown={(e) => { if (e.key === 'Enter') createChannel(); }} />
              <button onClick={createChannel} disabled={creatingChannel || !newChannelName.trim()} className="btn-primary whitespace-nowrap">
                {creatingChannel ? <Spinner size={16} /> : <Plus size={16} />}
                Créer
              </button>
            </div>
          </div>
          <div className="pt-3 border-t border-white/[0.06]">
            <label className="label flex items-center gap-1.5"><UserPlus size={14} /> Discussion privée</label>
            <div className="flex flex-wrap gap-2">
              {technicians.filter((t) => t.role === 'technician' && t.status === 'active').map((t) => (
                <button
                  key={t.id}
                  onClick={() => createDM(t.id)}
                  disabled={creatingChannel}
                  className="chip bg-white/[0.06] text-slate-300 hover:bg-white/[0.12] transition-colors disabled:opacity-50"
                >
                  {t.full_name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}