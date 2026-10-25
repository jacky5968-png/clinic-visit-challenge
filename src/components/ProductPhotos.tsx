import type { Product } from '../types';
import { AssetImage } from './AssetImage';

export function ProductPhotos({ product }: { product: Product }) {
  const photos = product.photos?.length ? product.photos : [{ src: product.image, caption: '' }];
  return (
    <div className={`product-photos ${photos.length > 1 ? 'multiple' : ''}`}>
      {photos.map((photo) => (
        <figure key={photo.src}>
          <AssetImage
            src={photo.src}
            alt={`${product.name}產品圖片${photo.caption ? `，${photo.caption}` : ''}`}
          />
          {photo.caption && <figcaption>{photo.caption}</figcaption>}
        </figure>
      ))}
    </div>
  );
}
