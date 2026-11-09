#import "LocationChoices.h"
static void Check(BOOL b){if(!b){fprintf(stderr,"FAIL\n");exit(1);}}
static double Distance(NSDictionary *a,NSDictionary *b){double x=[a[@"latitude"]doubleValue]*M_PI/180,y=[b[@"latitude"]doubleValue]*M_PI/180,dx=y-x,dy=([b[@"longitude"]doubleValue]-[a[@"longitude"]doubleValue])*M_PI/180;double h=pow(sin(dx/2),2)+cos(x)*cos(y)*pow(sin(dy/2),2);return 12742017.6*asin(sqrt(fmin(1,h)));}
int main(){@autoreleasepool{
 for(NSNumber *lat in @[@0,@39.9,@89.999,@90,@-90])for(NSNumber *lon in @[@0,@179.99999,@-180]){NSDictionary *base=@{@"latitude":lat,@"longitude":lon};for(int i=0;i<100;i++){NSDictionary *t=WLOCRandomTarget(base);Check(t!=nil);double d=Distance(base,t);Check(d>=7.99&&d<=12.01);}Check([base[@"latitude"]isEqual:lat]);}
 NSDictionary *base=@{@"latitude":@39.9,@"longitude":@116.2};Check(![WLOCRandomTarget(base)isEqual:WLOCRandomTarget(base)]);
 Check(!WLOCOffsetTarget(base,100,0));Check(!WLOCRandomTarget(@{}));
 NSString *suite=[@"locx-test-" stringByAppendingString:NSUUID.UUID.UUIDString];NSUserDefaults *store=[[NSUserDefaults alloc]initWithSuiteName:suite];
 Check(WLOCSaveFavorite(store,@" 家 ",base));Check(WLOCSaveFavorite(store,@"公司",base));Check(!WLOCSaveFavorite(store,@" ",base));
 NSArray *items=WLOCReadFavorites([[NSUserDefaults alloc]initWithSuiteName:suite]);Check(items.count==2);Check([items[0][@"name"]isEqual:@"家"]);Check([items[0][@"target"]isEqual:base]);
 WLOCDeleteFavorite(store,items[0][@"id"]);Check(WLOCReadFavorites(store).count==1);Check([WLOCReadFavorites(store)[0][@"name"]isEqual:@"公司"]);
 [store setObject:@[@{},@{@"name":@"bad",@"id":@"x",@"target":@{@"latitude":@999,@"longitude":@0}}] forKey:@"favoriteLocations"];Check(WLOCReadFavorites(store).count==0);[store removePersistentDomainForName:suite];
 puts("PASS: offset distance at poles/date line, original target preserved, favorites persistence/validation/deletion");
}return 0;}
