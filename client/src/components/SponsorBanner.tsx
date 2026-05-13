import { Instagram, MessageCircle } from "lucide-react";

export const SponsorBanner = ({ sponsor }: { sponsor: any }) => {
  if (!sponsor) return null;
  return (
    <div 
      className="w-full bg-card border border-accent/20 rounded-xl flex flex-col group cursor-pointer hover:border-accent transition-all relative overflow-hidden shadow-lg"
      onClick={() => {
        if (sponsor.whatsapp) window.open(sponsor.whatsapp, '_blank');
        else if (sponsor.instagram) window.open(sponsor.instagram, '_blank');
      }}
    >
      <div className="absolute top-2 left-2 px-2 py-0.5 bg-accent text-black text-[8px] font-black uppercase tracking-widest rounded-sm z-10 shadow-md">
        Patrocinador
      </div>
      <div className="w-full relative overflow-hidden flex items-center justify-center bg-black/5 flex-grow">
        {sponsor.image?.match(/\.(mp4|webm|ogg|mov|m4v|avi)([?#]|$)/i) ? (
          <video src={sponsor.image} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 max-h-[130px] md:max-h-[95px] p-0.5" autoPlay muted loop playsInline />
        ) : (
          <img src={sponsor.image} alt={sponsor.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 max-h-[130px] md:max-h-[95px] p-0.5" />
        )}
      </div>
      {(sponsor.instagram || sponsor.whatsapp) && (
        <div className="p-2 bg-accent/5 flex justify-center gap-4 border-t border-accent/10 shrink-0">
          {sponsor.instagram && (
            <a href={sponsor.instagram} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-accent transition-colors" onClick={(e) => e.stopPropagation()}>
              <Instagram className="w-3 h-3" />
              <span>Instagram</span>
            </a>
          )}
          {sponsor.whatsapp && (
            <a href={sponsor.whatsapp} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-accent transition-colors" onClick={(e) => e.stopPropagation()}>
              <MessageCircle className="w-3 h-3" />
              <span>WhatsApp</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
};
